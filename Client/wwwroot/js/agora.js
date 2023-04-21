let _appId = "";
let _token = "";
let _channel = "";

const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });

let localTracks = [];
let remoteUsers = {};

async function joinAndDisplayLocalStream() {
  client.on("user-published", handleUserJoined);
  client.on("user-left", handleUserLeft);

  let userId = await client.join(_appId, _channel, _token, null);

  localTracks = await AgoraRTC.createMicrophoneAndCameraTracks();

  let player = `<div class="video-container" id="user-container-${userId}">
                        <div class="video-player" id="user-${userId}"></div>
                  </div>`;
  document
    .getElementById("video-streams")
    .insertAdjacentHTML("beforeend", player);

  localTracks[1].play(`user-${userId}`);

  await client.publish([localTracks[0], localTracks[1]]);

  await triggerBlazorStateChangeAsync();
}

async function joinStream() {
  await joinAndDisplayLocalStream();
  document.getElementById("join-btn").style.display = "none";
  document.getElementById("stream-controls").style.display = "flex";

  document
    .getElementById("leave-btn")
    .addEventListener("click", leaveAndRemoveLocalStream);
  document.getElementById("mic-btn").addEventListener("click", toggleMic);
  document.getElementById("camera-btn").addEventListener("click", toggleCamera);
}

async function handleUserJoined(user, mediaType) {
  remoteUsers[user.uid] = user;
  await client.subscribe(user, mediaType);

  if (mediaType === "video") {
    let player = document.getElementById(`user-container-${user.uid}`);
    if (player != null) {
      player.remove();
    }

    player = `<div class="video-container" id="user-container-${user.uid}">
                        <div class="video-player" id="user-${user.uid}"></div> 
                 </div>`;
    document
      .getElementById("video-streams")
      .insertAdjacentHTML("beforeend", player);

    user.videoTrack.play(`user-${user.uid}`);
  }

  if (mediaType === "audio") {
    user.audioTrack.play();
  }

  await triggerBlazorStateChangeAsync();
}

async function handleUserLeft(user) {
  delete remoteUsers[user.uid];
  document.getElementById(`user-container-${user.uid}`).remove();
}

async function leaveAndRemoveLocalStream() {
  for (let i = 0; localTracks.length > i; i++) {
    localTracks[i].stop();
    localTracks[i].close();
  }

  await client.leave();
  document.getElementById("join-btn").style.display = "block";
  document.getElementById("stream-controls").style.display = "none";
  document.getElementById("video-streams").innerHTML = "";
}

async function toggleMic(e) {
  if (localTracks[0].muted) {
    await localTracks[0].setMuted(false);
    e.target.innerText = "Mic on";
  } else {
    await localTracks[0].setMuted(true);
    e.target.innerText = "Mic off";
  }
  await triggerBlazorStateChangeAsync();
}

async function toggleCamera(e) {
  if (localTracks[1].muted) {
    await localTracks[1].setMuted(false);
    e.target.innerText = "Camera on";
  } else {
    await localTracks[1].setMuted(true);
    e.target.innerText = "Camera off";
  }
}

async function initialize(appId, token, channel) {
  _appId = appId;
  _token = token;
  _channel = channel;

  document.getElementById("join-btn").addEventListener("click", joinStream);
}

// Sample of a function invoking .NET
async function triggerBlazorStateChangeAsync() {
  await DotNet.invokeMethod("BlazorAgora.Client", "JsInvokable");
}
