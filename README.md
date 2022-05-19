# Major-Project
#A WebRTC based video calling webapp for multiple users at the same time.

## Steps to run
`npm install`
to install all the required node modules
<br/>
`npm start`
to start the local server(port: 3000) to access the website

## Brief working
* Tech stack: **Nodes.js** for backend, **Vanilla js** for frontend, **Tailwind** for css(npm run build for starting tailwind), **peer.js** library for WebRTC
* The website acheives a video conference among multiple users throught WebRTC
* To implement WebRTC, we have used the peer.js library
* A randome UID is generated that acts as the room name. Eg: localhost:3000/thisIsMyRoomId
* A websocket connection is created using socket.io
* Once users are connected, their media streams(audio video tracks) are exchanged using the peer.js library
* For each users, an object of the class 'UserMediaContainer' is made to keep track of their properties.
* Use headphones for best use so that it doesn't fall into a noise feedback loop
