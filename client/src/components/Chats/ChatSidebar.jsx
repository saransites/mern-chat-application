import React, { useCallback, useEffect, useRef, useState } from "react";
import { Popup } from "../../utils/Popup";
import {
  logout,
  setCurrentUser,
  setOnlineUsers,
  UseApi,
} from "../global/slice";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import io from "socket.io-client";
import { FaSignOutAlt } from "react-icons/fa";
import useNetworkSpeed from "../../utils/useNetworkSpeed";

const placeholder =
  "https://www.lightsong.net/wp-content/uploads/2020/12/blank-profile-circle.png";

const ChatSidebar = () => {
  const api = UseApi();
  const networkStatus = useNetworkSpeed();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const logUser = useSelector((state) => state.data.user);
  const onlineUser = useSelector((state) => state.data.onlineUser);
  const currentUser = useSelector((state) => state.data.currentUser);
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [roomIds, setRoomIds] = useState([]);
  const socketRef = useRef(null);

  const handleChange = (e) => {
    setSearch(e.target.value);
  };
  useEffect(() => {
    if (networkStatus) {
      const { effectiveType } = networkStatus;
      const isSlowNetwork = effectiveType === "2g";

      if (isSlowNetwork) {
        Popup(
          "warning",
          "Your network speed is slow. You may experience delays."
        );
      }
    }
  }, [networkStatus]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        Popup("error", "User not authenticated");
        return;
      }
      const res = await api.get("/auth", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      // Check if res.data is an array
      if (Array.isArray(res?.data)) {
        const filteredUsers = res?.data?.filter(
          (user) => logUser?._id !== user?._id
        );
        setUsers(filteredUsers);
      } else {
        console.log("Unexpected response format:", res.data);
        Popup("error", "Unexpected response format");
      }
    } catch (err) {
      console.error(err);
      Popup("error", "Error fetching data");
    }
  };

  const handleLogout = () => {
    socketRef.current = io(import.meta.env.VITE_ENDPOINT, {
      transports: ["websocket", "polling", "flashsocket"],
    });
    try {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      dispatch(logout());
      socketRef.current.emit("user-logout", logUser?._id);
      navigate("/");
      window.location.reload(false);
    } catch (err) {
      Popup("error", "Something went wrong...Try again later");
    }
  };

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_ENDPOINT, {
      transports: ["websocket", "polling", "flashsocket"],
    });
    socketRef.current.on("online-users", (users) => {
      dispatch(setOnlineUsers(users));
    });

    return () => {
      socketRef.current.disconnect();
    };
  }, [dispatch, logUser._id, onlineUser]);
  const fetchRoomIds = useCallback(async () => {
    try {
      const res = await api.get("/chat/rooms");
      setRoomIds(res?.data);
    } catch (err) {
      console.log(err);
      Popup("error", "Error fetching room IDs");
    }
  }, [currentUser]);
  useEffect(() => {
    if (logUser) {
      fetchUsers();
      fetchRoomIds();
    }
  }, [logUser]);
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_ENDPOINT, {
      transports: ["websocket", "polling", "flashsocket"],
    });
    if (logUser) {
      const data = { userId: logUser?._id, roomIds: roomIds };
      socketRef.current.emit("user-login", data);
    }
  }, [logUser, roomIds]);

  const handleChatRoom = async (selectedUser) => {
    // const socket = io(import.meta.env.VITE_ENDPOINT);
    dispatch(setCurrentUser(selectedUser));
    const roomId =
      parseInt(logUser?.username?.slice(4)) +
      parseInt(selectedUser?.username?.slice(4));
    const data = {
      roomId,
      userId: logUser?._id,
    };
    // socket.emit("joinRoom", data);
    navigate(`/chatbox/${roomId}`);
  };

  const isUserOnline = (userId) => {
    return onlineUser && onlineUser[0]?.some((user) => user.userId === userId);
  };

  return (
    <div
      className={`sticky shadow-[0_0_1px_1px_#262626] h-[100dvh] top-0 grid grid-cols-1 ${
        location.pathname == "/chats" && "md:grid-cols-[250px_1fr]"
      }`}
    >
      <div className="">
        <div className={`bg-[rgba(255,255,255,0.1)] flex justify-between items-center gap-1.5`}>
          <h1 className="p-4 flex-1 text-white text-xl font-semibold">
            Chats
          </h1>
          <details className="relative">
            <summary className="list-none mr-2 md:mr-1 cursor-pointer hover:scale-95 transition-scale duration-500">
              <img src={placeholder} alt="log-user" className="w-9 h-9" />
            </summary>
            <ul className="absolute -left-32 bg-[rgba(255,255,255,0.1)] backdrop-blur-xl text-[#ffffff] p-2 rounded-md mt-1">
              <li className="tracking-wider mb-1 font-semibold">{logUser.email.split('@')[0]}</li>
              <li onClick={handleLogout} className="cursor-pointer hover:tracking-wider text-center tracking-wide bg-[#d55151] p-1.5 rounded transition-all duration-500">Signout</li>
            </ul>
          </details>
        </div>
        <ul className="list-none p-0 m-0">
          {users
            .filter((user) =>
              user.email.toLowerCase().includes(search.toLowerCase())
            )
            .map((user) => (
              <li
                key={user._id}
                className={`group flex items-center justify-between mt-2 p-2 rounded cursor-pointer ${
                  currentUser?._id == user._id &&
                  "bg-[rgba(255,255,255,0.1)] backdrop-blur-2xl"
                } hover:bg-[#658372de] transition-bg duration-500`}
                onClick={() => handleChatRoom(user)}
              >
                <figure className="flex gap-2 items-center overflow-hidden">
                  <img
                    src={placeholder}
                    alt="profile"
                    className="w-9 h-9 rounded-full group-hover:translate-x-0.5 transition-transform duration-500"
                  />
                  <figcaption>
                    <p className="font-bold text-sm tracking-wider capitalize group-hover:-translate-x-0.5 transition-transform duration-500">
                      {user.email.split("@")[0]}
                    </p>
                  </figcaption>
                </figure>
                <span className="text-sm text-gray-500">
                  {isUserOnline(user._id) ? "🟢" : "🔴"}
                </span>
              </li>
            ))}
        </ul>
      </div>
      {location.pathname == "/chats" && (
        <div className="hidden md:flex items-center h-screen justify-center">
          <h1 className="text-xl">Select user from chats...</h1>
        </div>
      )}
    </div>
  );
};

export default ChatSidebar;
