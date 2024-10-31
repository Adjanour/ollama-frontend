import { useState } from "react";
import ReactMarkdown from "react-markdown";
function ChatComponent() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState("");
	const [isStreaming, setIsStreaming] = useState(false);

	async function sendMessage() {
		if (!input.trim()) return;

		setMessages((prev) => [...prev, { role: "user", content: input }]);
		setInput("");
		setIsStreaming(true);

		const response = await fetch("http://localhost:3000/stream", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ prompt: input }),
		});

		const reader = response.body.getReader();
		const decoder = new TextDecoder("utf-8");

		// Clear the assistant's message content for each new response
		let assistantMessage = "";

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			const chunk = decoder.decode(value, { stream: true });

			// Process each line as a JSON object
			const lines = chunk.split("\n\n").filter(Boolean); // Separate by double newlines
			for (const line of lines) {
				if (line.startsWith("data:")) {
					const messageData = JSON.parse(line.slice(5));

					if (messageData.content === "[DONE]") {
						setIsStreaming(false);
						break;
					}

					// Append only new content for the assistant
					assistantMessage += messageData.content;
					setMessages((prev) => {
						const updatedMessages = [...prev];
						const lastMessage =
							updatedMessages[updatedMessages.length - 1];

						if (lastMessage.role === "assistant") {
							// Update the assistant's current response
							lastMessage.content = assistantMessage;
						} else {
							// Start a new assistant message
							updatedMessages.push({
								role: "assistant",
								content: assistantMessage,
							});
						}

						return updatedMessages;
					});
				}
			}
		}
	}

	return (
		<div className="flex flex-col h-screen bg-gray-100">
			<div className="flex-grow overflow-y-auto  p-4 ">
				<div className="m-auto max-w-4xl space-y-4">
					{messages.map((message, index) => (
						<div
							key={index}
							className={`flex ${
								message.role === "user"
									? "justify-end"
									: "justify-start"
							}`}
						>
							<div
								className={`p-3 rounded-[16px]  text-[1rem] max-w-4xl ${
									message.role === "user"
										? "bg-blue-500 text-white shadow-sm"
										: "bg-white-700 text-black shadow-sm"
								}`}
							>
								<ReactMarkdown>{message.content}</ReactMarkdown>
							</div>
						</div>
					))}
					{isStreaming && (
						<div className="flex justify-start">
							<div className="p-3 rounded-lg text-white max-w-xs bg-red-700 animate-pulse">
								Assistant is typing...
							</div>
						</div>
					)}
				</div>
			</div>
			<div className="p-4 bg-white flex items-center border-t border-gray-300">
				<input
					type="text"
					className="flex-grow px-4 py-2 border rounded-full focus:outline-none focus:border-blue-500"
					placeholder="Type your message..."
					value={input}
					onChange={(e) => setInput(e.target.value)}
					onKeyDown={(e) => e.key === "Enter" && sendMessage()}
					disabled={isStreaming}
				/>
				<button
					onClick={sendMessage}
					className="ml-2 px-4 py-2 bg-blue-500 text-white rounded-lg disabled:bg-blue-300"
					disabled={isStreaming || !input.trim()}
				>
					Send
				</button>
			</div>
		</div>
	);
}

export default ChatComponent;
