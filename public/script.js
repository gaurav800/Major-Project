const socket = io('/');
const peer = new Peer(undefined, {
	path: '/peerjs',
	host: '/',
	port: '443',
});

let myPeerId = null;
let userMediaContainers = new Map();


document.getElementById('video').onclick = toggleCamera;
document.getElementById('mic').onclick = toggleMic;


socket.on('connect', () => {
	console.log("Connected to room")
})

peer.on('open', peerId => {
	myPeerId = peerId;
	socket.emit('join-room', {roomId: roomId, peerId: peerId});
	console.log("My peerId: ", peerId)
})


socket.on('user-connected', ({peerId}) => {
	console.log("New peer connected to room: ", peerId);
	const call = peer.call(peerId, localStream);

	call.on('stream', remoteVideoStream => {
		const remoteContainerEl = document.createElement('div');
		document.getElementById('video-grid').append(remoteContainerEl);
		if(!userMediaContainers.has(peerId)) {
			userMediaContainers.set(peerId, new UserMediaContainer(peerId, remoteContainerEl, remoteVideoStream));
		}
	})
})

socket.on('video-on-server-to-client', ({ peerId }) => {
	console.log(`Switching off video for peer: ${peerId}`)
	const selectedPeer = userMediaContainers.get(peerId);
	if(!selectedPeer) return;
	selectedPeer.addVideo();
})

socket.on('video-off-server-to-client', ({ peerId }) => {
	console.log(`Switching off video for peer: ${peerId}`)
	const selectedPeer = userMediaContainers.get(peerId);
	if(!selectedPeer) return;
	selectedPeer.removeVideo();
})

socket.on('user-disconnected', ({ peerId }) => {
	console.log(`${peerId} disconnected`);
	const selectedPeer = userMediaContainers.get(peerId);
	if(!selectedPeer) return;
	selectedPeer.destroy();
	userMediaContainers.delete(peerId);
})


let localStream = null;
navigator.mediaDevices.getUserMedia({
	audio: true,
	video: true
}).then((stream) => {
	localStream = stream;
	const localContainerEl = document.createElement('div');
	document.getElementById('video-grid').append(localContainerEl);
	if(!userMediaContainers.has("local-user")) {
		userMediaContainers.set("local-user", new UserMediaContainer("local-user", localContainerEl, localStream));
	}

	peer.on('call', (call) => {
		let peerId = call.peer;
		call.answer(localStream);

		call.on('stream', remoteVideoStream => {
			if(!userMediaContainers.has(peerId)) {
				const remoteContainerEl = document.createElement('div');
				document.getElementById('video-grid').append(remoteContainerEl);
				userMediaContainers.set(peerId, new UserMediaContainer(peerId, remoteContainerEl, remoteVideoStream));
			}
		})
	})
}).catch(err => console.error(err));

function toggleCamera() {
	let enabled = localStream.getVideoTracks()[0].enabled;
	if (enabled) {
		localStream.getVideoTracks()[0].enabled = false;
		document.getElementById('video-logo').innerHTML = room_svg.videoOff;
		userMediaContainers.get("local-user").removeVideo();
		socket.emit('video-off-client-to-server');
	} else {
		document.getElementById('video-logo').innerHTML = room_svg.videoOn;
		localStream.getVideoTracks()[0].enabled = true;
		userMediaContainers.get("local-user").addVideo();
		socket.emit('video-on-client-to-server');
	}
}

function toggleMic() {
	let enabled = localStream.getAudioTracks()[0].enabled;
	if (enabled) {
		localStream.getAudioTracks()[0].enabled = false;
		document.getElementById('mic-logo').innerHTML = room_svg.micOff;
	} else {
		document.getElementById('mic-logo').innerHTML = room_svg.micOn;
		localStream.getAudioTracks()[0].enabled = true;
	}
}

class UserMediaContainer {
	constructor(peerId, parentDiv, stream) {
		this.peerId = peerId;
		this.parentDiv = parentDiv;
		this.parentDiv.id = `video-stream-${peerId}`

		this.displayPictureEle = document.createElement('div');
		this.videoEle = document.createElement("video");
		this.videoEle.srcObject = stream;
		this.videoEle.muted = false;

		this.toggleGestureRecogBtn = document.createElement('button');

		this._render();
	}

	_render() {
		this.parentDiv.className = `relative flex-auto h-full w-full overflow-hidden rounded-md bg-black border-[2px] border-black shadow-lg`;
		this.parentDiv.style.minHeight = "400px";

		this.displayPictureEle.className = `hidden flex items-center justify-center w-full h-full`;

		this.videoEle.className = `h-full w-full rounded-md`;
		this.videoEle.addEventListener('loadedmetadata', () => {
			this.videoEle.play();
		})

		this.toggleGestureRecogBtn.className = `absolute text-xs hover:bg-[#152D35] px-[12px] py-[6px] transition-colors duration-200 focus:outline-none w-[12px] h-[12px] bg-white bottom-4`;
		this.toggleGestureRecogBtn.innerHTML = "Enable Gesture Recog";

		this.toggleGestureRecogBtn.onclick = this.toggleGestureRecog;


		this.parentDiv.appendChild(this.displayPictureEle);
		this.parentDiv.appendChild(this.videoEle);
		this.parentDiv.appendChild(this.toggleGestureRecogBtn);

	}

	toggleGestureRecog() {
		console.log("Toggled Gesture Recog");
	}

	addVideo() {
		this.parentDiv.classList.replace("bg-[#95DAC1]", "bg-black");
		this.videoEle.classList.remove('hidden');
		this.displayPictureEle.classList.add('hidden');
	}

	removeVideo() {
		const randomImage = Math.floor(Math.random() * 10) + 1;
		this.displayPictureEle.innerHTML = `
			<div class="w-[150px] h-[150px] rounded-full bg-black border-2 border-black overflow-hidden">
				<img class="object-cover" src="/resources/images/${randomImage}.png">
			</div>
		`
		this.parentDiv.classList.replace("bg-black", "bg-[#95DAC1]");
		console.log("Video removed")
		this.videoEle.classList.add('hidden');
		this.displayPictureEle.classList.remove('hidden');
	}

	destroy() {
		this.parentDiv.remove();
	}
}

async function test() {
	console.log("Loading graph model");
	const net = await tf.loadGraphModel('https://tensorflowjsrealtimemodel.s3.au-syd.cloud-object-storage.appdomain.cloud/model.json');
	// console.log(net);

	const video = userMediaContainers.get("local-user").videoEle;
	
	const img = tf.browser.fromPixels(video);
	const resized = tf.image.resizeBilinear(img, [640,480]);
	const casted = resized.cast('int32');
	const expanded = casted.expandDims(0);
	const obj = await net.executeAsync(expanded);


	const classes = await obj[2].array();

	const boxes = await obj[1].array();
//   console.log("This is my class: ", classes);
	const scores = await obj[4].array();

	// Draw mesh
	// const ctx = canvasRef.current.getContext("2d");

	requestAnimationFrame(() => {drawRect(boxes[0], classes[0], scores[0], 0.5)});

	tf.dispose(img);
	tf.dispose(resized);
	tf.dispose(casted);
	tf.dispose(expanded);
	tf.dispose(obj);
}

function drawRect(boxes, classes, scores, threshold) {
	console.log("Inside drawRect");
	console.log(boxes.length);
	for(let i = 0; i < boxes.length; i++) {
		if(boxes[i] && classes[i] && scores[i]>threshold) {
			console.log("Over here")

			const[y,x,height,width] = boxes[i];
			const text = classes[i];

			// styling
			// ctx.strokeStyle= labelMap[text]['color'];
			// ctx.lineWidth = 10;
			// ctx.fillStyle = 'white';
			// ctx.font = '30px Arial';

			// // drawing
			// ctx.beginPath();
			// ctx.fillText(labelMap[text]['name'], x*imgWidth, y*imgHeight-10);
			// ctx.rect(x*imgWidth, y*imgHeight, width*imgWidth/2, height*imgHeight/1.5);
			// ctx.stroke();

			console.log("Drawing: ", labelMap[text]['name']);
			

		}
	}
}

const labelMap = {
	1: {name: 'Hello', color: 'red'},
	2: {name: 'Thank You', color: 'yellow'},
	3: {name: 'I Love You', color: 'lime'},
	4: {name: 'Yes', color: 'blue'},
	5: {name: 'No', color: 'purple'},
}