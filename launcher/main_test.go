package main

import (
	"bytes"
	"context"
	"errors"
	"io/fs"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"testing/fstest"
)

func testFiles() fs.FS {
	return fstest.MapFS{
		"index.html":          {Data: []byte("<!doctype html><title>Toolbox</title>")},
		"assets/app.js":       {Data: []byte("console.log('toolbox')")},
		"toolbox.config.json": {Data: []byte(`{"tools":{"des":false}}`)},
	}
}

func TestParseOptions(t *testing.T) {
	tests := []struct {
		name string
		args []string
		want int
	}{
		{name: "default", want: defaultPort},
		{name: "override", args: []string{"--port", "18080"}, want: 18080},
		{name: "equals override", args: []string{"--port=18081"}, want: 18081},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := parseOptions(test.args, &bytes.Buffer{})
			if err != nil {
				t.Fatalf("parseOptions() error = %v", err)
			}
			if got.port != test.want {
				t.Fatalf("port = %d, want %d", got.port, test.want)
			}
		})
	}
}

func TestParseOptionsRejectsInvalidValues(t *testing.T) {
	for _, args := range [][]string{
		{"--port", "0"},
		{"--port", "-1"},
		{"--port", "65536"},
		{"--port", "not-a-number"},
		{"unexpected"},
	} {
		if _, err := parseOptions(args, &bytes.Buffer{}); err == nil {
			t.Fatalf("parseOptions(%q) unexpectedly succeeded", args)
		}
	}
}

func TestAppHandlerServesEmbeddedResources(t *testing.T) {
	handler := newAppHandler(testFiles(), "")

	tests := []struct {
		path        string
		wantStatus  int
		wantBody    string
		contentType string
	}{
		{path: "/", wantStatus: http.StatusOK, wantBody: "Toolbox", contentType: "text/html"},
		{path: "/assets/app.js", wantStatus: http.StatusOK, wantBody: "console.log", contentType: "javascript"},
		{path: "/missing.txt", wantStatus: http.StatusNotFound},
	}

	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "http://example"+test.path, nil))
			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}
			if test.wantBody != "" && !strings.Contains(response.Body.String(), test.wantBody) {
				t.Fatalf("body %q does not contain %q", response.Body.String(), test.wantBody)
			}
			if test.contentType != "" && !strings.Contains(response.Header().Get("Content-Type"), test.contentType) {
				t.Fatalf("Content-Type = %q, want substring %q", response.Header().Get("Content-Type"), test.contentType)
			}
		})
	}
}

func TestAppHandlerRejectsTraversalAndUnsupportedMethods(t *testing.T) {
	handler := newAppHandler(testFiles(), "")

	request := httptest.NewRequest(http.MethodGet, "http://example/", nil)
	request.URL.Path = "/../private.txt"
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, request)
	if response.Code != http.StatusNotFound {
		t.Fatalf("traversal status = %d, want %d", response.Code, http.StatusNotFound)
	}

	response = httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest(http.MethodPost, "http://example/", nil))
	if response.Code != http.StatusMethodNotAllowed {
		t.Fatalf("POST status = %d, want %d", response.Code, http.StatusMethodNotAllowed)
	}
}

func TestRuntimeConfigPrefersExternalFile(t *testing.T) {
	directory := t.TempDir()
	configPath := filepath.Join(directory, runtimeConfigName)
	external := []byte(`{"tools":{"json":false}}`)
	if err := os.WriteFile(configPath, external, 0o600); err != nil {
		t.Fatal(err)
	}

	response := httptest.NewRecorder()
	newAppHandler(testFiles(), configPath).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "http://example/toolbox.config.json", nil))
	if response.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
	}
	if response.Body.String() != string(external) {
		t.Fatalf("body = %q, want %q", response.Body.String(), external)
	}
	if response.Header().Get("Cache-Control") != "no-store" {
		t.Fatalf("Cache-Control = %q, want no-store", response.Header().Get("Cache-Control"))
	}
}

func TestRuntimeConfigFallsBackToEmbeddedFile(t *testing.T) {
	for _, configPath := range []string{
		filepath.Join(t.TempDir(), "missing.json"),
		t.TempDir(),
	} {
		response := httptest.NewRecorder()
		newAppHandler(testFiles(), configPath).ServeHTTP(response, httptest.NewRequest(http.MethodGet, "http://example/toolbox.config.json", nil))
		if response.Code != http.StatusOK {
			t.Fatalf("status = %d, want %d", response.Code, http.StatusOK)
		}
		if !strings.Contains(response.Body.String(), `"des":false`) {
			t.Fatalf("body = %q, want embedded config", response.Body.String())
		}
	}
}

func TestRunStartsOnLoopbackAndOpensBrowser(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var requestedAddress string
	var openedURL string
	var output bytes.Buffer

	exitCode := run(ctx, nil, dependencies{
		staticFS: testFiles(),
		listen: func(network, address string) (net.Listener, error) {
			if network != "tcp4" {
				t.Fatalf("network = %q, want tcp4", network)
			}
			requestedAddress = address
			return net.Listen("tcp4", "127.0.0.1:0")
		},
		openURL: func(url string) error {
			openedURL = url
			cancel()
			return nil
		},
		stdout: &output,
		stderr: &bytes.Buffer{},
	})

	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	if requestedAddress != "127.0.0.1:15173" {
		t.Fatalf("listen address = %q", requestedAddress)
	}
	if !strings.HasPrefix(openedURL, "http://127.0.0.1:") {
		t.Fatalf("opened URL = %q", openedURL)
	}
	if !strings.Contains(output.String(), openedURL) {
		t.Fatalf("output %q does not contain URL %q", output.String(), openedURL)
	}
}

func TestRunUsesCustomPortAndHandlesBrowserFailure(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var requestedAddress string
	var stderr bytes.Buffer

	exitCode := run(ctx, []string{"--port", "18080"}, dependencies{
		staticFS: testFiles(),
		listen: func(_ string, address string) (net.Listener, error) {
			requestedAddress = address
			return net.Listen("tcp4", "127.0.0.1:0")
		},
		openURL: func(string) error {
			cancel()
			return errors.New("browser unavailable")
		},
		stdout: &bytes.Buffer{},
		stderr: &stderr,
	})

	if exitCode != 0 {
		t.Fatalf("exit code = %d, want 0", exitCode)
	}
	if requestedAddress != "127.0.0.1:18080" {
		t.Fatalf("listen address = %q", requestedAddress)
	}
	if !strings.Contains(stderr.String(), "browser unavailable") || !strings.Contains(stderr.String(), "http://127.0.0.1:") {
		t.Fatalf("stderr = %q, want browser warning and manual URL", stderr.String())
	}
}

func TestRunDoesNotOpenBrowserWhenListenFails(t *testing.T) {
	opened := false
	var stderr bytes.Buffer
	exitCode := run(context.Background(), nil, dependencies{
		staticFS: testFiles(),
		listen: func(_, _ string) (net.Listener, error) {
			return nil, errors.New("address already in use")
		},
		openURL: func(string) error {
			opened = true
			return nil
		},
		stdout: &bytes.Buffer{},
		stderr: &stderr,
	})
	if exitCode == 0 {
		t.Fatal("exit code = 0, want non-zero")
	}
	if opened {
		t.Fatal("browser opened after listen failure")
	}
	if !strings.Contains(stderr.String(), "address already in use") || !strings.Contains(stderr.String(), "--port") {
		t.Fatalf("stderr = %q, want actionable listen error", stderr.String())
	}
}
