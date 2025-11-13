import { useState, useEffect, useRef } from "react";

type UsernameEntryProps = {
  onSubmit: (username: string) => void;
};

export function UsernameEntry({ onSubmit }: UsernameEntryProps) {
  const [username, setUsername] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim()) {
      onSubmit(username.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && username.trim()) {
      onSubmit(username.trim());
    }
  };

  return (
    <div className="min-h-screen bg-black text-green-500 p-8 font-mono">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <pre className="text-green-500 text-xs mb-4">
            {`███╗   ███╗ █████╗ ███████╗███████╗    ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗
████╗ ████║██╔══██╗╚══███╔╝██╔════╝    ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║
██╔████╔██║███████║  ███╔╝ █████╗         ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║
██║╚██╔╝██║██╔══██║ ███╔╝  ██╔══╝         ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║
██║ ╚═╝ ██║██║  ██║███████╗███████╗       ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
╚═╝     ╚═╝╚═╝  ╚═╝╚══════╝╚══════╝       ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝`}
          </pre>
        </div>

        <div className="mb-4 text-green-400">
          <p>$ Initializing system...</p>
          <p>$ Loading maze protocol...</p>
          <p>$ Connection established</p>
        </div>

        <div className="mb-2 text-green-500">
          <p>━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━</p>
        </div>

        <form onSubmit={handleSubmit} className="mb-4">
          <div className="flex items-center">
            <span className="text-green-500 mr-2">root@maze:~$</span>
            <span className="text-green-400">{username}</span>
            <span
              style={showCursor ? { opacity: 1 } : { opacity: 0 }}
              className={`text-green-400`}
            >
              _
            </span>
            <input
              ref={inputRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={(e) => e.target.focus()}
              onKeyDown={handleKeyDown}
              className="absolute"
              style={{
                opacity: 0,
              }}
              spellCheck={false}
              autoComplete="off"
            />
          </div>
        </form>

        <div className="text-green-700 text-sm mt-8">
          <p>&gt; Type your username and press ENTER to connect</p>
          <p>&gt; Use arrow keys to navigate maze</p>
          <p>&gt; Reach the exit before your opponent</p>
        </div>

        <div className="mt-8 text-green-900 text-xs">
          <p>System v1.0.0 | Status: READY</p>
        </div>
      </div>
    </div>
  );
}
