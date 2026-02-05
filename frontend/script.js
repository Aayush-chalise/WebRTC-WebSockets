const getMedia = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1300, height: 800 },
    audio: true,
  });
  console.log(stream);

  document.getElementById("localVideo").srcObject = stream;
};

getMedia();

const createPeerConnection = () => {
  const peerConnection = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  });
  // add local strean to connection
  stream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, stream);
  });
};

createPeerConnection();

const createOffer = async () => {
  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  // Send offer to other user via signaling server
};

const receiveOffer = async () => {
  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  // Send answer back via signaling
};
