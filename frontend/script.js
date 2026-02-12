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
  peerConnection = new RTCPeerConnection(configuration); // this creates a connection object that manages everything like Audio/video transmission, ICE candidates, Network negotiation, Media tracks
  // configuration tells if peers are behing NAT use STUN server to help connect
  //ice candidates are possible network routes to reach you

  peerConnection.onicecandidate = (event) => {
    // This event fires whenever browser finds a new route/candidates.
    if (event.candidate) {
      socket.emit("ice-candidate", event.candidate); // Send candidate to other peer using signaling server
    }
  };

  peerConnection.ontrack = (event) => {
    //This runs when :  Remote user sends audio/video tracks
    remoteVideo.srcObject = event.streams[0];
  };

  localStream
    .getTracks() // localStream is a object that contains array of streams like [audiostream, videostream] which can be accessible using localStream.getTracks
    .forEach((track) => peerConnection.addTrack(track, localStream)); //loop through each track like audiostream & videostream  AND Sends your media to remote peer.
}

// Caller Side
async function startCall() {
  await initMedia();
  createPeerConnection();
  const offer = await peerConnection.createOffer(); // Browser creates something called SDP Offer
  // 👉 SDP = Session Description Protocol
  // (It describes how you want to communicate)
  //SDP contains audio/video support codec types , networking info
  await peerConnection.setLocalDescription(offer);
  //   This tells your browser:
  // 👉 "This offer is my official configuration."
  // Now your browser:
  // Stores the offer
  // Starts gathering ICE candidates
  // Triggers onicecandidate event
  socket.emit("offer", offer); //This sends the offer to the other peer using signaling server.
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

  // A caller and a Reciever both have local description and remote description . in local description they set their description which can be either offer or answer for a caller it would be offer and for receiver it would be answer . Now in remote description, lets say for caller it would set the answer coming from receiver and for receiver it would set the offer coming from caller to the remote description.
  // so it is like HANDSHAKING 
  await peerConnection.setRemoteDescription( // Tells your browser: "This is how the OTHER peer wants to communicate."
    new RTCSessionDescription(incomingOffer), // This converts raw offer data into WebRTC format.
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

socket.on("answer", async (answer) => {  // final step where the caller will receive answer and put the answer in its remote description.
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
