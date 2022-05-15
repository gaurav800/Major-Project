const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server)
const { v4: uuidv4 } = require('uuid');

const { ExpressPeerServer } = require('peer');
const peerServer = ExpressPeerServer(server, {
	debug: true
})

app.set('view engine', 'ejs');

app.use(express.static('public'));
app.use('/peerjs', peerServer);

io.on('connection', socket => {
	socket.on('join-room', ({roomId, peerId}) => {
		console.log(`--------connecting to ${roomId}-----------`)
		socket.join(roomId);
		socket.to(roomId).emit('user-connected', {peerId})
		socket.emit('user connected');

		socket.on('video-on-client-to-server', () => {
			socket.to(roomId).emit("video-on-server-to-client", { peerId: peerId});
		})

		socket.on('video-off-client-to-server', () => {
			socket.to(roomId).emit("video-off-server-to-client", { peerId: peerId});
		})

		socket.on("disconnect", () => {
			socket.to(roomId).emit("user-disconnected", { peerId: peerId }); 
		});
	})


})


app.get('/', function(req, res) {
	res.redirect(`/${uuidv4()}`)
})

app.get('/:roomId', function(req, res) {
	res.render('room', { roomId:  req.params.roomId})
})


server.listen(process.env.PORT || 3000, function(req,res) {
	console.log("Listening to port 3000");
})