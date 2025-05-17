"use client";

import { useState, useEffect, useRef } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { use } from "react";
import Dice from 'react-dice-roll';
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

function Spinner() {
  return (
    <div role="status">
      <svg
        aria-hidden="true"
        className="w-20 h-20 mr-2 text-gray-200 animate-spin dark:text-gray-600 fill-white"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
      <span className="sr-only">Loading...</span>
    </div>
  );
}

export default function Adventure(props: {
  params: Promise<{ adventureId: Id<"adventures"> }>;
}) {
  const handlePlayerAction = useAction(api.chat.handlePlayerAction);
  const chatRef = useRef<HTMLDivElement>(null);
  const [typingText, setTypingText] = useState<string>("");

  const { adventureId } = use(props.params);

  const items = useQuery(api.inventory.getAllItems, {});

  const entries = useQuery(api.chat.getAllEntries, {
    adventureId,
  });
  const [message, setMessage] = useState("");
  const [showInput, setShowInput] = useState(false);

  const lastEntry = entries && entries[entries.length - 1];

  const [isRolling, setIsRolling] = useState(false);
  const [rolledValue, setRolledValue] = useState<1 | 2 | 3 | 4 | 5 | 6 | undefined>(undefined);
  const [cheatRollTrigger, setCheatRollTrigger] = useState(0);

  useEffect(() => {
    if (lastEntry?.response) {
      const words = lastEntry.response
        .trim()
        .split(/(\s+|\n)/)
        .filter((word) => word !== "");

      setTypingText(words[0] || "");
      setShowInput(false);

      let index = 0;

      const interval = setInterval(() => {
        if (index < words.length - 1) {
          setTypingText((prevText) =>
            words[index] === "\n"
              ? `${prevText}\n`
              : `${prevText}${words[index]}`
          );
          index++;
        } else {
          clearInterval(interval);
          setTypingText((prevText) => {
            const lines = prevText.split("\n");
            if (lines.length > 0) {
              const lastLine = lines.pop();
              return [...lines, `**${lastLine?.trim()}**`].join("\n");
            }
            return prevText;
          });

          setShowInput(true);
        }
      }, 10);

      return () => clearInterval(interval);
    }
  }, [lastEntry]);

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [entries, typingText]);

  return (
    <main
      className="min-h-screen bg-black bg-opacity-70 text-white font-chakra p-6 flex flex-row justify-center gap-6"
      style={{
        backgroundImage: "url('/BG.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >

      <div className="flex flex-col justify-between">
        <div>
          {/* Play Again button */}
          <button
            className="mb-4 bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => window.location.href = "http://localhost:3000"}
          >
            Play Again
          </button>
        </div>

        {/* Health */}
        <div className="flex-grow flex items-center">
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: lastEntry?.health ?? 0 }).map((_, idx) => (
              <svg
                key={idx}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-8 h-8 text-red-600 fill-red-600"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-6 w-full max-w-4xl">

        {/* IMAGE */}
        <div className="w-[500px] h-[400px] rounded-xl overflow-hidden">
          {lastEntry?.imageUrl ? (
            <img src={lastEntry.imageUrl} className="object-cover w-full h-full opacity-80" />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Spinner /> Loading image...
            </div>
          )}
        </div>

        {/* CHAT Dialog*/}
        <div
          ref={chatRef}
          className="rounded-xl h-[400px] overflow-y-auto w-full bg-gray-800 p-4 scrollbar-thin"
        >
          {entries?.map((entry, idx) => (
            <div key={entry._id} className="p-2 flex flex-col gap-4 text-lg">
              {idx > 0 && (
                <div>
                  <div className="font-bold">You:</div>
                  <ReactMarkdown>{entry.input}</ReactMarkdown>
                </div>
              )}
              <div>
                <div className="font-bold">Dungeon Master:</div>
                <ReactMarkdown>
                  {idx === entries.length - 1 ? typingText : entry.response}
                </ReactMarkdown>
              </div>
            </div>
          ))}
        </div>

        {/* Dice Animation*/}
        <AnimatePresence>
          {isRolling && (
            <motion.div
              key="dice-overlay"
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
            >
              <motion.div
                initial={{ scale: 0, rotate: 90, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={{ scale: 0.3, rotate: -90, opacity: 0 }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              >
                <Dice
                  size={150}
                  defaultValue={rolledValue}
                  key={cheatRollTrigger}
                  onRoll={(value: 1 | 2 | 3 | 4 | 5 | 6) => {
                    setRolledValue(value);
                    setMessage(value.toString());

                    setTimeout(() => {
                      setIsRolling(false);
                    }, 500);
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/*Dice + Input */}

        {!isRolling && (
          <div className="w-full flex gap-4 items-center">
            <button
              type="button"
              className="p-2 rounded bg-gray-700 hover:bg-gray-600 text-white text-xl"
              onClick={() => {
                const rolled = (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6;
                setRolledValue(rolled);
                setIsRolling(true);
                setCheatRollTrigger((prev) => prev + 1);
              }}
            >
              🎲 Roll
            </button>

            <form
              className="flex gap-2 flex-grow"
              onSubmit={(e) => {
                e.preventDefault();
                handlePlayerAction({ message, adventureId });
                setMessage("");
              }}
            >
              <input
                className="px-2 p-2 rounded text-white flex-grow bg-gray-700 text-xl"
                name="user-prompt"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <button className="rounded-md bg-gray-500 hover:bg-gray-400 px-3 py-2">
                Submit
              </button>
            </form>
          </div>
        )}

      </div>

      {/* Inventory */}
      <div className="flex flex-col justify-center gap-3">
        <div className="text-5xl flex flex-col items-center font-bold">Inventory</div>
        {lastEntry?.inventory.map((itemName, idx) => {
          const item = items?.find((item) => item.itemName === itemName);

          return (
            <div className="text-white" key={idx}>
              {/* {item && item.imageUrl ? (
                <div className="flex flex-col text-center text-xl">
                  <img
                    className="rounded-xl border-gray-500 border"
                    src={
                      (items ?? []).find((item) => item.itemName === itemName)
                        ?.imageUrl
                    }
                  />
                  {itemName}
                </div>
              ) : (
                <div className="text-xl flex flex-col items-center">
                  <Spinner />
                  {itemName}
                </div>
              )} */}
              <div className="text-2xl flex flex-col items-center">

                {itemName}
              </div>
            </div>
          );
        })}
      </div>
    </main>


  );
}
