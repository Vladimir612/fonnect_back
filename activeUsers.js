let activeUsers = [];

const addUser = (username) => {
  activeUsers.push(username);
};

const removeUser = (username) => {
  const index = activeUsers.indexOf(username);
  if (index !== -1) {
    activeUsers.splice(index, 1);
  }
};

const emitActiveUsers = (io) => {
  io.emit("activeUsers", { activeUsers });
};

const isUserActive = (username) => {
  return activeUsers.includes(username);
};

export { addUser, removeUser, emitActiveUsers, isUserActive };
