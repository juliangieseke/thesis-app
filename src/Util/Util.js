import {
  XHRConnection,
  AbstractConnection,
  ConnectionEvent
} from "@dcos/connections";
import ConnectionManager from "@dcos/connection-manager";
import { List } from "immutable";
import Authenticator from "../Authenticator/Authenticator";

const Util = {
  updateElement(id, content) {
    document.getElementById(id).innerHTML = content;
  },
  getIntVal(id) {
    return parseInt(document.getElementById(id).value);
  },

  randtimer: null,
  runnerCreated: 0,
  runnerCompleted: 0,
  inittimestamp: Date.now(),

  startInfoInterval() {
    console.log(`Tick: ${Math.floor((Date.now()-Util.inittimestamp)/1000)}s`);
    setInterval(() => {
      console.log(`Tick: ${Math.floor((Date.now()-Util.inittimestamp)/1000)}s`);
    }, 5000);
  },

  updateHtml() {
    const openList = ConnectionManager.list().filter(
      listItem => listItem.connection.state === AbstractConnection.OPEN
    );
    const waitingList = ConnectionManager.list().filter(
      listItem => listItem.connection.state === AbstractConnection.INIT
    );

    Util.updateElement("cmopen", openList.size);
    Util.updateElement("cmwaiting", waitingList.size);

    if (openList.size) {
      Util.updateElement(
        "openlist",
        openList
          .reduce(
            (prev, cur) => {
              return prev.concat(
                cur
                  ? `${cur.connection.url} - ${cur.priority} - ${Math.round(
                      (Date.now() - cur.connection.created) / 1000
                    )}s<br>`
                  : "<br>"
              );
            },
            ["<br>", "<br>", "<br>", "<br>", "<br>", "<br>"]
          )
          .slice(-6)
          .join("")
      );
    } else {
      Util.updateElement("openlist", "no open connections<br><br><br><br><br><br>");
    }

    if (waitingList.size) {
      Util.updateElement(
        "waitinglist",
        waitingList
          .slice(0, 10)
          .setSize(10)
          .reduce((prev, cur, index) => {
            return prev.concat(
              cur
                ? `${cur.connection.url} - ${cur.priority} - ${Math.round(
                    (Date.now() - cur.connection.created) / 1000
                  )}s<br>`
                : "<br>"
            );
          }, [])
          .join("")
      );
      Util.updateElement("lastwaiting", waitingList.last().connection.url);
    } else {
      Util.updateElement(
        "waitinglist",
        "no waiting connections<br><br><br><br><br><br><br><br><br><br>"
      );
      Util.updateElement("lastwaiting", "no waiting connections");
    }

    window.requestAnimationFrame(this.updateHtml.bind(this));
  },

  nexttimer() {
    const minint = this.getIntVal("randomintmin");
    const maxint = this.getIntVal("randomintmax");
    if (
      !document.getElementById("maxlength").checked ||
      (document.getElementById("maxlength").checked &&
        ConnectionManager.list().filter(
          listItem => listItem.connection.state === AbstractConnection.INIT
        ).size < 10)
    ) {
      const minprio = this.getIntVal("randommin");
      const maxprio = this.getIntVal("randommax");
      const priority =
        Math.round(Math.random() * (maxprio - minprio)) + minprio;
      const connection = new XHRConnection(
        `data/${Math.ceil(
          Math.random() * 7
        )}.txt?c=${Date.now()}-random-${this.runnerCreated++}-${priority}`
      );
      ConnectionManager.schedule(connection, priority);
      if (document.getElementById("increaseprio").checked) {
        window.setTimeout(() => {
          ConnectionManager.schedule(connection, priority + 1);
        }, 60000);
      }
    }
    this.randtimer = window.setTimeout(
      this.nexttimer.bind(this),
      Math.round(Math.random() * (maxint - minint)) + minint
    );
  },

  addManualRequest() {
    const priority = parseInt(document.getElementById("initprio").value);
    if (
      !document.getElementById("initadd").checked &&
      !document.getElementById("initopen").checked
    ) {
      console.log("Manual Add: doing nothing");
      return;
    }
    console.log("Manually creating connection");
    const connection = new XHRConnection(
      `data/${parseInt(
        document.getElementById("initfile").selectedIndex
      ) + 1}.txt?c=${Date.now()}-manual-${Util.runnerCreated++}-${priority}`
    );
    console.log("Manually adding event handlers");
    document.getElementById("initwaiting").innerHTML = "0";
    document.getElementById("initcomplete").innerHTML = "0";
    document.getElementById("initfirstdata").innerHTML = "0";
    connection
      .once(ConnectionEvent.OPEN, event => {
        console.log("Manually added connection event: OPEN");
        document.getElementById("initwaiting").innerHTML =
          (Date.now() - event.target.created) / 1000;
      })
      .once(ConnectionEvent.COMPLETE, event => {
        console.log("Manually added connection event: COMPLETE");
        document.getElementById("initcomplete").innerHTML =
          (Date.now() - event.target.created) / 1000;
      })
      .once(ConnectionEvent.DATA, event => {
        console.log("Manually added connection event: DATA");
        document.getElementById("initfirstdata").innerHTML =
          (Date.now() - event.target.created) / 1000;
      });

    if (document.getElementById("initcancel").checked) {
      setTimeout(() => {
        if (connection.state === AbstractConnection.INIT) connection.close();
      }, parseInt(document.getElementById("initcancelafter").value));
    }
    if (document.getElementById("initadd").checked) {
      console.log("Manually schedule() connection");
      ConnectionManager.schedule(connection, priority);
    }
    if (document.getElementById("initopen").checked) {
      console.log("Manually open() connection");
      connection.open();
    }
  },

  updateWaitingRequest() {
    const connection = ConnectionManager.list()
      .filter(listItem => listItem.connection.state === AbstractConnection.INIT)
      .last().connection;
    if (connection.state !== AbstractConnection.CLOSED) {
      ConnectionManager.schedule(
        connection,
        parseInt(document.getElementById("waitingresprio").value)
      );
    }
  }
};
export default Util;
