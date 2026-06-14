import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const filePath = path.join(__dirname, 'src/pages/Chats.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace the messages rendering section
content = content.replace(
  `              ) : (
                messages.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={\`flex \${isMine ? 'justify-end' : 'justify-start'} items-end gap-2\`}>
                      {!isMine && (
                        <img src={msg.sender.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${msg.sender.name}\`}
                          className="w-7 h-7 rounded-full border border-pink-200 flex-shrink-0 mb-1" />
                      )}
                      <div className={\`max-w-[70%] \${isMine ? 'items-end' : 'items-start'} flex flex-col\`}>
                        {!isMine && <p className="text-[10px] text-gray-400 mb-1 ml-1">{msg.sender.name}</p>}
                        <div className={\`px-4 py-2.5 rounded-2xl \${isMine
                          ? 'bg-pink-500 text-white rounded-br-sm'
                          : 'bg-white border border-pink-100 text-gray-900 rounded-bl-sm shadow-sm'
                        }\`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>
                        <p className={\`text-[10px] mt-1 \${isMine ? 'text-right text-gray-400' : 'text-gray-400 ml-1'}\`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && <span className="ml-1">{msg.isRead ? '✓✓' : '✓'}</span>}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}`,

  `              ) : (
                messages.map(msg => {
                  const isMine = msg.senderId === user?.id;
                  return (
                    <div key={msg.id} className={\`flex \${isMine ? 'justify-end' : 'justify-start'} items-end gap-2 w-full\`}>

                      {/* Incoming — avatar on LEFT */}
                      {!isMine && (
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <img
                            src={msg.sender.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${msg.sender.name}\`}
                            className="w-8 h-8 rounded-full border-2 border-pink-200"
                          />
                        </div>
                      )}

                      {/* Bubble */}
                      <div className={\`flex flex-col max-w-[65%] \${isMine ? 'items-end' : 'items-start'}\`}>
                        {/* Name label */}
                        <p className="text-[11px] font-semibold text-gray-500 mb-1 px-1">
                          {isMine ? 'You' : msg.sender.name}
                        </p>

                        <div className={\`px-4 py-2.5 rounded-2xl shadow-sm \${isMine
                          ? 'bg-pink-500 text-white rounded-br-none'
                          : 'bg-white border border-pink-100 text-gray-900 rounded-bl-none'
                        }\`}>
                          <p className="text-sm leading-relaxed">{msg.content}</p>
                        </div>

                        {/* Time + read receipt */}
                        <p className={\`text-[10px] mt-1 flex items-center gap-1 \${isMine ? 'text-gray-400' : 'text-gray-400'}\`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {isMine && (
                            <span className={\`font-bold \${msg.isRead ? 'text-blue-500' : 'text-gray-300'}\`}>
                              {msg.isRead ? '✓✓' : '✓'}
                            </span>
                          )}
                        </p>
                      </div>

                      {/* Outgoing — avatar on RIGHT */}
                      {isMine && (
                        <div className="flex flex-col items-center gap-1 flex-shrink-0">
                          <img
                            src={user?.avatar || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${user?.name}\`}
                            className="w-8 h-8 rounded-full border-2 border-pink-400"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}`
);

fs.writeFileSync(filePath, content);
console.log('✅ Chat messages updated!');
console.log('  - Incoming: avatar LEFT, bubble LEFT');
console.log('  - Outgoing: bubble RIGHT, avatar RIGHT');
console.log('  - Name shown above every message');
console.log('  - Blue ✓✓ for read, grey ✓ for sent');