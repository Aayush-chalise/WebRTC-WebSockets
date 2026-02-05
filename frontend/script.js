// Connect to signaling server
const socket = io("http://localhost:5000"); // Use backend URL

// DOM Elements
const localVideo = document.getElementById("localVideo");
const remoteVideo = document.getElementById("remoteVideo");
const incomingCallDiv = document.getElementById("incomingCall");

let localStream;
let peerConnection;
let incomingOffer = null;

// STUN server config
const configuration = {
  iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
};

// ======================
// Get Camera + Mic
// ======================
async function initMedia() {
  localStream = await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: true,
  });
  localVideo.srcObject = localStream;
}

// ======================
// Create PeerConnection
// ======================
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(configuration);

  // Send ICE candidates
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate);
    }
  };

  // Receive remote stream
  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // Add local tracks
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // Connection state change log
  peerConnection.onconnectionstatechange = () => {
    console.log("Connection state:", peerConnection.connectionState);
  };
}

// ======================
// Start Call (Caller)
// ======================
async function startCall() {
  alert("Calling...");

  await initMedia();
  createPeerConnection();

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit("offer", offer);
}

// ======================
// Receive Offer (Receiver)
// ======================
socket.on("offer", (offer) => {
  incomingOffer = offer;
  incomingCallDiv.style.display = "block"; // Show Accept/Reject
});

// ======================
// Accept Call
// ======================
async function acceptCall() {
  incomingCallDiv.style.display = "none";

  await initMedia();
  createPeerConnection();

  await peerConnection.setRemoteDescription(incomingOffer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit("answer", answer);
}

// ======================
// Reject Call
// ======================
function rejectCall() {
  incomingOffer = null;
  incomingCallDiv.style.display = "none";
}

// ======================
// Receive Answer (Caller)
// ======================
socket.on("answer", async (answer) => {
  await peerConnection.setRemoteDescription(answer);
  alert("Call Connected!");
});

// ======================
// Receive ICE Candidates
// ======================
socket.on("ice-candidate", async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
  } catch (err) {
    console.error(err);
  }
});
