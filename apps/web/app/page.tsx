"use client"
import { useEffect, useRef, useState } from "react"
import { io } from "socket.io-client"
import ReactPlayer from "react-player"
import Stream from "stream"

export default function Page() {
  const [myid, setMyid] = useState("")
  const socket = useRef(
    io("http://localhost:8000/", {
      reconnectionDelayMax: 10000,
      auth: {
        token: "123"
      },
      query: {
        "my-key": "my-value"
      }
    })
  )
  // now ge the stream and to render it on the page
  const [stream ,setStream]=useState<MediaStream|null>(null)
  const peer = useRef<RTCPeerConnection | null>(null)
  const [client,setClient] = useState("")

  useEffect(() => {
    // create peer connection when component mounts
    peer.current = new RTCPeerConnection({
      iceServers: [
        {
          urls: ["stun:stun.l.google.com:19302"], // public Google STUN server
        },
      ],
    })

    function onConnect({ id }: { id: string }): void {
      console.log("Connected with id:", id)
      setMyid(id)
    }
    async function answer({id,offer}:{id:string,offer:RTCSessionDescriptionInit}){
      console.log(offer)
      
      if(!peer.current)
        return
      peer.current.setRemoteDescription(new RTCSessionDescription(offer))
      const answer=await peer.current.createAnswer()
      await peer.current.setLocalDescription(answer)
      socket.current.emit("accept",{id,answer})
    }

    async function receive_answer({id,answer}:{id:string,answer:RTCSessionDescriptionInit}){
      if(!peer.current)
        return
      await peer.current.setRemoteDescription(new RTCSessionDescription(answer))
    }
    peer.current.onicecandidate = (event) => {
      console.log("ice candidate")
      if (event.candidate) {
        socket.current.emit("ice-candidate", { id: client, candidate: event.candidate });
      }
    };
    
    async function send_ice({ candidate })  {
      if(peer.current)

      peer.current.addIceCandidate(new RTCIceCandidate(candidate));
    }
    // when you receive a remote ICE candidate
    socket.current.on("ice-candidate", send_ice);
    socket.current.on("signal",answer)
    socket.current.on("accept",receive_answer)
    socket.current.on("connected", onConnect)
    peer.current.createDataChannel("chat")

    return () => {
      socket.current.off("connected", onConnect)
      socket.current.off("signal",answer)
      socket.current.off("accept",receive_answer)
      socket.current.off("ice-candidate",send_ice)
      socket.current.disconnect()
      peer.current?.close()
    }
  }, [])
  

  // now the use effect to ge tht stream to render the page on the client
  useEffect(()=>{
   async function renderThemediaOnPage(){
    const stream=await navigator.mediaDevices.getUserMedia({
      audio:true,
      video:true
     })
     setStream(stream)
   }
   renderThemediaOnPage()
  },[])
  async function signaling() {
    if (!peer.current) return
    const offer = await peer.current.createOffer()
    await peer.current.setLocalDescription(offer)

    socket.current.emit("signal", { id: client, offer })
  }


  return (
    <div className="">
      <h1>{myid}</h1>
      <input
        type="text"
        value={client}
        onChange={(e) => {
          setClient(e.target.value)
        }}
      />
      <button onClick={signaling}>connect</button>

      {stream && (
  <video
    autoPlay
    muted
    playsInline
    style={{ width: "400px", height: "300px", background: "black" }}
    ref={(video) => {
      if (video && stream) {
        video.srcObject = stream
      }
    }}
  />
)}

    </div>
  )
}
