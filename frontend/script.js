// REPLACE THIS URL with your actual ngrok URL
const NGROK_URL = "https://unshifted-reasonlessly-billye.ngrok-free.dev/";

const socket = io(NGROK_URL, {
  extraHeaders: {
    "ngrok-skip-browser-warning": "true",
  },
});

const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const incomingCallDiv = document.getElementById("incomingCall");

let localStream;
let peerConnection;
let incomingOffer = null;
let pendingCandidates = [];

const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// Visual Connection Status
socket.on("connect", () => {
  console.log("Connected to server!");
  document.body.style.border = "5px solid green";
});

socket.on("connect_error", (err) => {
  console.log("Connection error:", err);
  document.body.style.border = "5px solid red";
});

async function initMedia() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
  }
}

function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  localStream
    .getTracks()
    .forEach((track) => peerConnection.addTrack(track, localStream));
}

// Caller Side
async function startCall() {
  await initMedia();
  createPeerConnection();
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);
  socket.emit("offer", offer);
  console.log("Offer sent...");
}

// Receiver Side
socket.on("offer", async (offer) => {
  console.log("Received offer...");
  incomingOffer = offer;
  incomingCallDiv.style.display = "block";
});

async function acceptCall() {
  incomingCallDiv.style.display = "none";
  await initMedia();
  createPeerConnection();

  await peerConnection.setRemoteDescription(
    new RTCSessionDescription(incomingOffer),
  );
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  socket.emit("answer", answer);

  // Process any ICE candidates that arrived before the connection was ready
  pendingCandidates.forEach((candidate) => {
    peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  });
  pendingCandidates = [];
}

socket.on("answer", async (answer) => {
  console.log("Received answer...");
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
});

socket.on("ice-candidate", async (candidate) => {
  if (peerConnection && peerConnection.remoteDescription) {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  } else {
    pendingCandidates.push(candidate);
  }
});
