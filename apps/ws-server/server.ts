import { createServer } from "http";
import { Server } from "socket.io";

const httpServer = createServer();

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:3000", // your frontend origin
    methods: ["GET", "POST"],
    credentials: true
  }
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.emit("connected", { id: socket.id });

  socket.on("signal", (data) => {
    console.log("Signal received:", data);
    
    io.to(data.id).emit("signal", {...data,id:socket.id});
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
  socket.on("ice-candidate", (data) => {
    console.log("ICE candidate received:", data);
    io.to(data.id).emit("ice-candidate", { id: socket.id, candidate: data.candidate });
  });
  
  socket.on("accept",(data)=>{
   io.to(data.id).emit("accept",{id:socket.id,answer:data.answer})
  })
});

httpServer.listen(8000, () => {
  console.log("Server running on http://localhost:8000");
});
