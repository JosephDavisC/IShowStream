# Build stage
FROM golang:1.23-alpine AS build

WORKDIR /app

# Set Go to auto-download toolchain if needed (for dependencies requiring newer Go)
ENV GOTOOLCHAIN=auto

# Install git (required for some Go dependencies)
RUN apk add --no-cache git

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies (Go will auto-download newer toolchain if needed)
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o chat-ingestion .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from build stage
COPY --from=build /app/chat-ingestion .

# Expose port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Run the application
CMD ["./chat-ingestion"]

