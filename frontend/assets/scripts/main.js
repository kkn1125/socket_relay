import { v4 } from "uuid";
import axios from "axios";

const canvas = document.querySelector("canvas#app");
const ctx = canvas.getContext("2d");
const users = new Map();
const userInfo = {};
const game = {
  size: {
    user: {
      x: 30,
      y: 30,
    },
  },
};

/* events */
window.addEventListener("load", (e) => {
  console.log("hello");
  axios
    .post(`/v1/query/attach`, {
      uuid: v4(),
      locale: navigator.language,
      pox: canvas.clientWidth / 2 - game.size.user.x / 2,
      poy: canvas.clientHeight / 2 - game.size.user.y / 2,
      poz: 0,
      roy: (Math.PI / 180) * 90,
    })
    .then((result) => {
      const { data } = result;
      Object.assign(userInfo, data);
      console.log(userInfo);
      const { server, channel, socket } = data;
    });
});
window.addEventListener("click", (e) => {
  const target = e.target;
  if (target.id !== "login") return;
  const nickname = document.querySelector("#nickname");
  const password = document.querySelector("#password");
  if (!nickname.value | !password.value) return;

  axios.post(`/v1/query/login`).then((result) => {
    const { data } = result;
  });
});
window.addEventListener("keyup", (e) => {});
window.addEventListener("keydown", (e) => {});
/* events */

function update() {
  // users
  for (let user of users.values()) {
    ctx.fillRect(user.pox, user.poy, game.size.user.x, game.size.user.y);
    ctx.fillText(
      user.nickname,
      user.pox,
      user.poy,
      game.size.user.x,
      game.size.user.y
    );
    ctx.textAlign = "center";
  }
}

function clearRender() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
}

function render() {
  clearRender();
  update();
  requestAnimationFrame(render);
}
requestAnimationFrame(render);
