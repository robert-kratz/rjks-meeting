# rjks-meeting

rjks-meet is a simple WebRTC experiment using Next.js, Mediasoup, and Docker.
This project is not intended for production—I’m just playing around with WebRTC and testing different setups. 🚀

Features

-   WebRTC-based real-time communication
-   Mediasoup for media streaming
-   Next.js for the frontend
-   Docker & NGINX for easy deployment

## Setup

### 1. Clone the repository:

```ssh
1. git clone https://github.com/robert-kratz/rjks-meeting.git && cd rjks-meet
```

### 2. Create a .env file and define the HOST_IP:

```ssh
echo "HOST_IP=your-public-ip" > .env
```

### 3. Build and start the container:

```ssh
docker-compose up -d --build
```

### 4. Access the app at http://your-domain.com or http://localhost:8050

Notes

-   Uses Docker Compose with an external nginx_network
-   WebRTC signaling happens via Mediasoup
-   This is purely for experimentation—don’t use in production!
