"""
HTTP Server wrapper for Cloud Run deployment
Runs the agent orchestrator in a background thread while serving HTTP health checks
"""
import os
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler
from orchestrator import AgentOrchestrator


class HealthCheckHandler(BaseHTTPRequestHandler):
    """Simple HTTP handler for health checks"""
    
    def do_GET(self):
        """Handle GET requests - return 200 OK for health checks"""
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK - StreamSense Agents Running')
    
    def log_message(self, format, *args):
        """Suppress HTTP request logs to keep output clean"""
        pass


def run_orchestrator():
    """Run the agent orchestrator in a background thread"""
    print("🤖 Starting Agent Orchestrator...")
    orchestrator = AgentOrchestrator()
    orchestrator.process_messages()


def main():
    """Main entry point - start HTTP server and orchestrator"""
    # Start orchestrator in background thread
    orchestrator_thread = threading.Thread(target=run_orchestrator, daemon=True)
    orchestrator_thread.start()
    
    # Start HTTP server for health checks
    port = int(os.getenv('PORT', '8080'))
    server = HTTPServer(('0.0.0.0', port), HealthCheckHandler)
    print(f"🌐 HTTP Health Check Server running on port {port}")
    print("=" * 70)
    print()
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        server.shutdown()


if __name__ == "__main__":
    main()

