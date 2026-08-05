package main

import (
	"bytes"
	"context"
	"embed"
	"errors"
	"flag"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"time"
)

const (
	defaultPort       = 15173
	loopbackHost      = "127.0.0.1"
	runtimeConfigName = "toolbox.config.json"
)

//go:embed all:web
var embeddedFiles embed.FS

type options struct {
	port int
}

type dependencies struct {
	staticFS   fs.FS
	configPath string
	listen     func(network, address string) (net.Listener, error)
	openURL    func(string) error
	stdout     io.Writer
	stderr     io.Writer
}

func main() {
	staticFS, err := fs.Sub(embeddedFiles, "web")
	if err != nil {
		fmt.Fprintf(os.Stderr, "无法加载内嵌资源: %v\n", err)
		os.Exit(1)
	}

	configPath := ""
	if executable, executableErr := os.Executable(); executableErr == nil {
		configPath = filepath.Join(filepath.Dir(executable), runtimeConfigName)
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	os.Exit(run(ctx, os.Args[1:], dependencies{
		staticFS:   staticFS,
		configPath: configPath,
		listen:     net.Listen,
		openURL:    openDefaultBrowser,
		stdout:     os.Stdout,
		stderr:     os.Stderr,
	}))
}

func parseOptions(args []string, output io.Writer) (options, error) {
	flags := flag.NewFlagSet("dev-toolbox", flag.ContinueOnError)
	flags.SetOutput(output)
	port := flags.Int("port", defaultPort, "本地服务端口 (1-65535)")
	if err := flags.Parse(args); err != nil {
		return options{}, err
	}
	if flags.NArg() != 0 {
		return options{}, fmt.Errorf("不支持的位置参数: %s", strings.Join(flags.Args(), " "))
	}
	if *port < 1 || *port > 65535 {
		return options{}, fmt.Errorf("端口必须是 1 至 65535 范围内的整数，当前值为 %d", *port)
	}
	return options{port: *port}, nil
}

func run(ctx context.Context, args []string, deps dependencies) int {
	if deps.stdout == nil {
		deps.stdout = io.Discard
	}
	if deps.stderr == nil {
		deps.stderr = io.Discard
	}

	opts, err := parseOptions(args, deps.stderr)
	if err != nil {
		fmt.Fprintf(deps.stderr, "参数错误: %v\n", err)
		return 2
	}
	if deps.staticFS == nil || deps.listen == nil || deps.openURL == nil {
		fmt.Fprintln(deps.stderr, "启动器内部依赖不完整")
		return 1
	}

	address := net.JoinHostPort(loopbackHost, strconv.Itoa(opts.port))
	listener, err := deps.listen("tcp4", address)
	if err != nil {
		fmt.Fprintf(deps.stderr, "无法监听 %s: %v\n请使用 --port <端口> 选择其他端口。\n", address, err)
		return 1
	}

	url := "http://" + listener.Addr().String() + "/"
	server := &http.Server{
		Handler:           newAppHandler(deps.staticFS, deps.configPath),
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       30 * time.Second,
	}
	serveErrors := make(chan error, 1)
	go func() {
		serveErrors <- server.Serve(listener)
	}()

	fmt.Fprintf(deps.stdout, "Dev Toolbox 已启动: %s\n按 Ctrl+C 停止服务。\n", url)
	if err := deps.openURL(url); err != nil {
		fmt.Fprintf(deps.stderr, "警告: 无法自动打开浏览器: %v\n请手动访问 %s\n", err, url)
	}

	select {
	case serveErr := <-serveErrors:
		if serveErr != nil && !errors.Is(serveErr, http.ErrServerClosed) {
			fmt.Fprintf(deps.stderr, "本地服务异常停止: %v\n", serveErr)
			return 1
		}
		return 0
	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
		defer cancel()
		if shutdownErr := server.Shutdown(shutdownCtx); shutdownErr != nil {
			_ = server.Close()
			fmt.Fprintf(deps.stderr, "停止本地服务失败: %v\n", shutdownErr)
			return 1
		}
		fmt.Fprintln(deps.stdout, "Dev Toolbox 已停止。")
		return 0
	}
}

type appHandler struct {
	staticFS   fs.FS
	configPath string
}

func newAppHandler(staticFS fs.FS, configPath string) http.Handler {
	return &appHandler{staticFS: staticFS, configPath: configPath}
}

func (handler *appHandler) ServeHTTP(response http.ResponseWriter, request *http.Request) {
	response.Header().Set("X-Content-Type-Options", "nosniff")
	if request.Method != http.MethodGet && request.Method != http.MethodHead {
		response.Header().Set("Allow", "GET, HEAD")
		http.Error(response, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	if request.URL.Path == "/"+runtimeConfigName {
		handler.serveRuntimeConfig(response, request)
		return
	}

	name, valid := resourceName(request.URL.Path)
	if !valid {
		http.NotFound(response, request)
		return
	}
	info, err := fs.Stat(handler.staticFS, name)
	if err != nil || info.IsDir() {
		http.NotFound(response, request)
		return
	}
	content, err := fs.ReadFile(handler.staticFS, name)
	if err != nil {
		http.NotFound(response, request)
		return
	}
	http.ServeContent(response, request, name, time.Time{}, bytes.NewReader(content))
}

func resourceName(requestPath string) (string, bool) {
	if requestPath == "/" {
		return "index.html", true
	}
	if !strings.HasPrefix(requestPath, "/") {
		return "", false
	}
	name := strings.TrimPrefix(requestPath, "/")
	if !fs.ValidPath(name) || strings.Contains(name, "\\") {
		return "", false
	}
	return name, true
}

func (handler *appHandler) serveRuntimeConfig(response http.ResponseWriter, request *http.Request) {
	response.Header().Set("Cache-Control", "no-store")
	response.Header().Set("Content-Type", "application/json; charset=utf-8")

	content, err := readExternalConfig(handler.configPath)
	if err != nil {
		content, err = fs.ReadFile(handler.staticFS, runtimeConfigName)
	}
	if err != nil {
		http.Error(response, "Runtime configuration unavailable", http.StatusInternalServerError)
		return
	}
	response.Header().Set("Content-Length", strconv.Itoa(len(content)))
	if request.Method == http.MethodGet {
		_, _ = response.Write(content)
	}
}

func readExternalConfig(configPath string) ([]byte, error) {
	if configPath == "" {
		return nil, os.ErrNotExist
	}
	return os.ReadFile(configPath)
}
