// import { convertLangToRegion } from "../../../frontend/src/utils/tools.js";
import { sql } from "../database/mariadb.js";
import Query from "../models/Query.js";
import { convertLangToRegion } from "../utils/tools.js";

const options = {
  limit: {
    inventory: 50,
    socket: 50,
    server: 5,
    channel: 50,
  },
  ip: {
    socket: "192.168.254.16",
  },
  port: {
    socket: 4000,
  },
};

async function findEmptyServerChannel(createUser) {
  /* server indexing */
  let emptyServer = null;
  const [readServer] = await sql
    .promise()
    .query(`SHOW TABLE STATUS WHERE name = 'server'`);

  /* channel indexing */
  let emptyChannel = null;
  const [readChannel] = await sql
    .promise()
    .query(`SHOW TABLE STATUS WHERE name = 'channel'`);

  /* is full channel */
  const [isFullChannel] = await sql.promise().query(
    `SELECT 
      channel_id, channel.limits, COUNT(*) AS user_count
    FROM
      enter
        LEFT JOIN
      channel ON channel.id = enter.channel_id
    GROUP BY channel_id`
  );

  if (isFullChannel.length === 0) {
    emptyChannel = readChannel[0].Auto_increment;
    await sql.promise().query(
      `INSERT iNTO channel (name, limits)
      VALUES (?, ?)`,
      ["channel${readChannel[0].Auto_increment}", options.limit.channel]
    );
  } else {
    let isFull = true;
    for (let i = 0; i < isFullChannel.length; i++) {
      const usableChannel = isFullChannel[i];
      if (usableChannel.user_count < usableChannel.limits) {
        emptyChannel = usableChannel.channel_id;
        isFull = false;
        break;
      }
    }
    if (isFull) {
      emptyChannel = readChannel[0].Auto_increment;
      await sql.promise().query(
        `INSERT iNTO channel (name, limits)
        VALUES (?, ?)`,
        ["channel${emptyChannel}", options.limit.channel]
      );
    }
  }

  /* is full server */
  const [isFullServer] = await sql.promise().query(
    `SELECT 
      server_id,
      channel_id,
      server.limits,
      channel.limits AS channel_limits,
      COUNT(DISTINCT (channel_id)) AS channel_count,
      COUNT(user_id) AS user_count
    FROM
      enter
        LEFT JOIN
      server ON server.id = enter.server_id
        LEFT JOIN
      channel ON channel.id = enter.channel_id
    GROUP BY server_id`
  );
  if (isFullServer.length === 0) {
    emptyServer = readServer[0].Auto_increment;
    await sql.promise().query(
      `INSERT iNTO server (name, limits)
      VALUES (?, ?)`,
      ["server${readServer[0].Auto_increment}", options.limit.channel]
    );
  } else {
    let isFull = true;
    for (let i = 0; i < isFullServer.length; i++) {
      const usableServer = isFullServer[i];
      if (
        usableServer.channel_count < usableServer.limits ||
        usableServer.user_count / usableServer.channel_count <
          usableServer.channel_limits
      ) {
        emptyServer = usableServer.server_id;
        isFull = false;
        break;
      }
    }
    if (isFull) {
      emptyServer = readServer[0].Auto_increment;
      await sql.promise().query(
        `INSERT iNTO server (name, limits)
        VALUES (?, ?)`,
        ["server${emptyServer}", options.limit.channel]
      );
    }
  }

  /* insert enter row in empty server and channel */
  await sql.promise().query(
    `INSERT INTO enter (server_id, channel_id, user_id, type, status)
        VALUES (?, ?, ?, ?, ?)`,
    [emptyServer, emptyChannel, createUser.insertId, "viewer", true]
  );

  return {
    server: {
      id: emptyServer,
    },
    channel: {
      id: emptyChannel,
    },
  };
}

async function findEmptySocket(data, createUser) {
  /* channel indexing */
  let emptySocket = null;
  let ip = null;
  let port = null;
  let limits = null;
  const [readSocket] = await sql
    .promise()
    .query(`SHOW TABLE STATUS WHERE name = 'socket'`);

  /* is full socket */
  const [isFullSocket] = await sql.promise().query(
    `SELECT 
      socket_id,
      socket.ip,
      socket.port,
      socket.limits,
      COUNT(*) AS user_count
    FROM
      connection
        LEFT JOIN
      socket ON socket.id = connection.socket_id
    GROUP BY socket_id`
  );

  if (isFullSocket.length === 0) {
    emptySocket = readSocket[0].Auto_increment;
    ip = options.ip.socket;
    port = options.port.socket + readSocket[0].Auto_increment - 1;
    limits = options.limit.socket;
    await sql.promise().query(
      `INSERT iNTO socket (ip, port, limits)
      VALUES (?, ?, ?)`,
      [ip, port, options.limit.socket]
    );
  } else {
    let isFull = true;
    for (let i = 0; i < isFullSocket.length; i++) {
      const usableSocket = isFullSocket[i];
      if (usableSocket.user_count < usableSocket.limits) {
        emptySocket = usableSocket.socket_id;
        ip = usableSocket.ip;
        port = usableSocket.port;
        limits = options.limit.socket;
        isFull = false;
        break;
      }
    }
    if (isFull) {
      emptySocket = readSocket[0].Auto_increment;
      ip = options.ip.socket;
      port = options.port.socket + readSocket[0].Auto_increment - 1;
      limits = options.limit.socket;
      await sql.promise().query(
        `INSERT iNTO socket (ip, port, limits)
        VALUES (?, ?, ?)`,
        [ip, port, options.limit.socket]
      );
    }
  }
  /* insert enter row in empty socket */
  await sql.promise().query(
    `INSERT INTO connection (socket_id, user_id, locale, connected)
        VALUES (?, ?, ?, ?)`,
    [emptySocket, createUser.insertId, convertLangToRegion(data.locale), true]
  );
  return {
    ip: ip,
    port: port,
    limits: limits,
  };
}

Query.attach = async (req, res, next) => {
  const data = req.body;
  let returnData = {
    serverChannel: null,
    socket: null,
  };
  const [readUser] = await sql
    .promise()
    .query(`SHOW TABLE STATUS WHERE name = 'user'`);

  const [createUser] = await sql.promise().query(
    `INSERT INTO user (uuid, email, password, nickname, limit_inventory, deletion)
    VALUES (?, ?, ?, ?, ?, ?)`,
    [
      data.uuid,
      "",
      "",
      `guest${readUser[0].Auto_increment || 0}`,
      options.limit.inventory,
      false,
    ]
  );

  try {
    returnData.serverChannel = await findEmptyServerChannel(createUser);
    returnData.socket = await findEmptySocket(data, createUser);

    returnData.location = await sql.promise().query(
      `INSERT INTO location (user_id, pox, poy, poz, roy)
      VALUES (?, ?, ?, ?, ?)`,
      [createUser.insertId, data.pox, data.poy, 0, data.roy]
    );
  } catch (e) {
    console.log(e.message);
  }

  // res.status(200).json({
  //   ok: true,
  //   user: {
  //     id: createUser.insertId,
  //     uuid: data.uuid,
  //     locale: convertLangToRegion(data.locale),
  //   },
  //   server: returnData.serverChannel.server,
  //   channel: returnData.serverChannel.channel,
  //   socket: returnData.socket,
  // });
  return {
    user: {
      id: createUser.insertId,
      uuid: data.uuid,
      locale: convertLangToRegion(data.locale),
    },
    server: returnData.serverChannel.server,
    channel: returnData.serverChannel.channel,
    socket: returnData.socket,
  };
};

Query.login = async (req, res, next) => {
  const data = req.body;
  await sql.promise().query(
    `UPDATE user
    LEFT JOIN enter
    ON enter.user_id = user.id
    SET nickname = ?, password = ?
    WHERE uuid = ?
    AND enter.server_id = ? AND enter.channel_id = ?`,
    [data.nickname, data.password, data.uuid, data.server, data.channel]
  );
  await sql.promise().query(
    `UPDATE enter
    SET type = 'player'
    WHERE server_id = ?
    AND channel_id = ?
    AND user_id = (
      SELECT id
      FROM user
      WHERE uuid = ?
    )`,
    [data.server, data.channel, data.uuid]
  );
  const [readPlayers] = await sql.promise().query(
    `SELECT
      user.uuid,
      user.nickname,
      enter.server_id,
      enter.channel_id,
      location.pox,
      location.poy,
      location.poz,
      location.roy
    FROM location
      LEFT JOIN user
        ON location.user_id = user.id
      LEFT JOIN enter
        ON location.user_id = enter.user_id
    WHERE enter.type = 'player'
    `,
    [data.server, data.channel]
  );
  res.status(200).json({
    ok: true,
    players: readPlayers,
  });
};

Query.logout = async (req, res, next) => {
  const data = req.body;
  await sql.promise().query(`DELETE FROM user WHERE uuid = ?`, [data.uuid]);
  const [readPlayers] = await sql.promise().query(
    `SELECT
      user.uuid,
      user.nickname,
      enter.server_id,
      enter.channel_id,
      location.pox,
      location.poy,
      location.poz,
      location.roy
    FROM location
      LEFT JOIN user
        ON location.user_id = user.id
      LEFT JOIN enter
        ON location.user_id = enter.user_id
    WHERE enter.type = 'player'
    `,
    [data.server, data.channel]
  );
  res.status(200).json({
    ok: true,
    players: readPlayers,
  });
};

Query.location = async (req, res, next) => {
  const data = req.body;
  await sql.promise().query(
    `UPDATE location
    SET
      pox = ?,
      poy = ?,
      poz = ?,
      roy = ?
    WHERE user_id = (
      SELECT id
      FROM user
      WHERE uuid = ?
    )`,
    [data.pox, data.poy, data.poz, data.roy, data.uuid]
  );
  res.status(200).json({
    ok: true,
  });
};

Query.players = async (req, res, next) => {
  const data = req.body;
  const [readPlayers] = await sql.promise().query(
    `SELECT
      user.uuid,
      user.nickname,
      enter.server_id,
      enter.channel_id,
      location.pox,
      location.poy,
      location.poz,
      location.roy
    FROM location
      LEFT JOIN user
        ON location.user_id = user.id
      LEFT JOIN enter
        ON location.user_id = enter.user_id
    WHERE enter.type = 'player'
    `,
    [data.server, data.channel]
  );
  res.status(200).json({
    players: readPlayers,
  });
};

const queryService = Query;

export default queryService;
