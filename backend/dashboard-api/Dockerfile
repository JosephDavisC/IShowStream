# Build stage
FROM golang:1.23 AS build

WORKDIR /app

# Set Go to auto-download toolchain if needed (for dependencies requiring newer Go)
ENV GOTOOLCHAIN=auto

# Copy go.mod and go.sum first for better Docker layer caching
COPY go.mod go.sum ./

# Download dependencies (Go will auto-download newer toolchain if needed)
RUN go mod download

# Copy source code
COPY . .

# Build the application (go build will handle any go.mod updates automatically)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o dashboard-api .

# Production stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates

WORKDIR /root/

# Copy the binary from build stage
COPY --from=build /app/dashboard-api .

# Expose port
EXPOSE 8082

# Set environment variable for port
ENV PORT=8082

# Run the application
CMD ["./dashboard-api"]

