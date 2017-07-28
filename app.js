var express=require('express'),
app=express(),
server=require('http').createServer(app),
io=require('socket.io').listen(server),
mongoose=require('mongoose');
usernames=[];

server.listen(process.env.PORT || 3000);

//connect to mongodb
mongoose.connect('mongodb://localhost/chat',function(err){
	if(err){
		console.log(err);
	}else{
		console.log('connected to mongodb');
	}
});

//user schema
var chatSchema=mongoose.Schema({
	user:String,
	msg:String,
	created:{type:Date,default:Date.now}
});

//create a model Chat,collection 'Message' using chatSchema
var Chat=mongoose.model('Message',chatSchema);

app.get('/',function (req,res) {
	res.sendFile(__dirname + '/' + 'chat.html');
});

//connect to socket io

io.sockets.on('connection',function (socket) {

	//we are getting all the msgs back,we have only logged msgs so limit the msgs
	var query=Chat.find({});
	//-created for showing recent 10 messages
	/*query.sort('-created').limit(10).exec(function(err,docs){
		if(err) throw err;
		console.log('sending old msgs' + '---->' + docs);
		socket.emit('load old msgs',docs);
	});*/
	//for getting all msgs,we have included scroll bar..so no problem
	query.exec(function(err,docs){
		if(err) throw err;
		console.log('sending old msgs' + '---->' + docs);
		socket.emit('load old msgs',docs);
	});

	socket.on('new user',function(data,callback){
		if(usernames.indexOf(data) != -1){
			callback(false);
		}else{
			callback(true);
			socket.username=data;
			usernames.push(socket.username);
			updateUsernames();
		}
	});
	//update usernames
	function updateUsernames(){
		io.sockets.emit('usernames',usernames);
	}

	//send message
	socket.on('send message',function (data) {
		var newMsg=new Chat({msg:data,user:socket.username});
		newMsg.save(function(err){
			if(err) throw err; 
			io.sockets.emit('new message',{msg: data,user:socket.username});
		});
		
	});

	//Disconnect
	socket.on('disconnect',function(data){
		if(!socket.username) return;
		usernames.splice(usernames.indexOf(socket.username),1);
		updateUsernames();
	});
});