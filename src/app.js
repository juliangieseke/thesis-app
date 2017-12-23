import { XHRConnection, AbstractConnection, ConnectionEvent } from "@dcos/connections";
import { ConnectionManager, ConnectionQueueItem } from "@dcos/connection-manager";
import { List } from "immutable";

const connectionManager = new ConnectionManager(5, ConnectionManager.PRIORITY_INTERACTIVE);
let randtimer;
let runnerCreated = 0;
let runnerCompleted = 0;

let loginlifetime = 180000; // 3min
let loginstatus = true;
let loginexpire = Date.now() + loginlifetime;
let loginrenewal = "inactive";

connectionManager.setToken(loginexpire)

function updateHtml() {

    const openList = connectionManager.list().filter(listItem => listItem.connection.state === AbstractConnection.OPEN);
    const waitingList = connectionManager.list().filter(listItem => listItem.connection.state === AbstractConnection.INIT);

    document.getElementById("loginstatus").innerHTML = loginstatus;
    document.getElementById("loginexpire").innerHTML = Math.round((loginexpire - Date.now()) / 1000);
    document.getElementById("loginrenewal").innerHTML = loginrenewal;
    
    document.getElementById("cmopen").innerHTML = openList.size;
    document.getElementById("cmwaiting").innerHTML = waitingList.size;

    if (openList.size) {
        document.getElementById("openlist").innerHTML = openList.reduce((prev, cur) => {
            return prev.concat(cur 
                ? `${cur.connection.url} - ${cur.priority} - ${Math.round((Date.now() - cur.connection.created)/1000)}s<br>`
                : "<br>");
            }, ["<br>","<br>","<br>","<br>","<br>"]).slice(-5).join("");
    } else {
        document.getElementById("openlist").innerHTML = "no open connections<br><br><br><br><br>";
    }

    if (waitingList.size) {
        document.getElementById("waitinglist").innerHTML = waitingList.slice(0, 10).setSize(10).reduce((prev, cur, index) => {
            return prev.concat(cur 
                ? `${cur.connection.url} - ${cur.priority} - ${Math.round((Date.now() - cur.connection.created)/1000)}s<br>`
                : "<br>");
        }, []).join("");
        document.getElementById("lastwaiting").innerHTML = waitingList.last().connection.url;
    } else {
        document.getElementById("waitinglist").innerHTML = "no waiting connections<br><br><br><br><br><br><br><br><br><br>";
        document.getElementById("lastwaiting").innerHTML = "no waiting connections";
    }

    window.requestAnimationFrame(updateHtml);
}

function nexttimer() {
    const minint = parseInt(document.getElementById("randomintmin").value);
    const maxint = parseInt(document.getElementById("randomintmax").value);
    if(!document.getElementById("maxlength").checked 
        || (document.getElementById("maxlength").checked 
            && connectionManager.list().filter(listItem => listItem.connection.state === AbstractConnection.INIT).size < 10
        )
    ) {
        const minprio = parseInt(document.getElementById("randommin").value);
        const maxprio = parseInt(document.getElementById("randommax").value);
        const priority = Math.round(Math.random() * (maxprio - minprio)) + minprio;
        const connection = new XHRConnection(`data/${Math.ceil(Math.random() * 7)}.txt?c=${Date.now()}-random-${runnerCreated++}-${priority}`);
        connectionManager.schedule(connection, priority);
        if (document.getElementById("increaseprio").checked) {
            window.setTimeout(() => { connectionManager.schedule(connection, priority+1); }, 60000)
        }
    }
    randtimer = window.setTimeout(nexttimer, Math.round(Math.random() * (maxint - minint)) + minint)
}

function renew() {
    let started;
    if (loginrenewal === "inactive" && (loginexpire - Date.now()) < 60000) {
        loginrenewal = "renewing";
        let connection = new XHRConnection(`data/token.txt?e=${loginexpire}`, {
            listeners: [
                {
                    type: ConnectionEvent.OPEN,
                    callback: event => started = Date.now()
                },
                {
                    type: ConnectionEvent.COMPLETE,
                    callback: event => {
                        if (Date.now() < loginexpire) {
                            loginexpire = started + loginlifetime;
                            connectionManager.setToken(loginexpire);
                            loginrenewal = "inactive";
                        } else {
                            loginrenewal = "timeout";
                            loginstatus = false;
                        }
                    }
                },
                {
                    type: ConnectionEvent.ERROR,
                    callback: event => {
                        loginstatus = false;
                        loginrenewal = "failed"
                    }
                }
            ],
            open: true
        });
        connectionManager.schedule(
            connection,
            ConnectionManager.PRIORITY_SYSTEM
        );
    }
}


document.getElementById("randomstop").addEventListener("click", function () {
    window.clearTimeout(randtimer);
    randtimer = false;
});
document.getElementById("randomstart").addEventListener("click", function () {
    if (randtimer) return;
    nexttimer();
});

document.getElementById("looppause").addEventListener("click", connectionManager.pause);
document.getElementById("loopresume").addEventListener("click", connectionManager.resume);


document.getElementById("initcreate").addEventListener("click", function () {
    const priority = parseInt(document.getElementById("initprio").value);
    if (!document.getElementById("initadd").checked && !document.getElementById("initopen").checked) {
        console.log("doing nothing");
        return;
    }
    console.log("Manually creating connection");
    const connection = new XHRConnection(`data/${parseInt(document.getElementById("initfile").selectedIndex)+1}.txt?c=${Date.now()}-manual-${runnerCreated++}-${priority}`)
    console.log("Manually adding event handlers");
    document.getElementById("initwaiting").innerHTML = "0";
    document.getElementById("initcomplete").innerHTML = "0";
    document.getElementById("initfirstdata").innerHTML = "0";
    connection
        .once(ConnectionEvent.OPEN, event => {
            console.log("Manually added connection event: OPEN");
            document.getElementById("initwaiting").innerHTML = (Date.now() - event.target.created) / 1000;
        })
        .once(ConnectionEvent.COMPLETE, event => {
            console.log("Manually added connection event: COMPLETE");
            document.getElementById("initcomplete").innerHTML = (Date.now() - event.target.created) / 1000;
        })
        .once(ConnectionEvent.DATA, event => {
            console.log("Manually added connection event: DATA");
            document.getElementById("initfirstdata").innerHTML = (Date.now() - event.target.created) / 1000;
        });

    if(document.getElementById("initcancel").checked) {
        setTimeout(() => {
            if(connection.state === AbstractConnection.INIT) connection.close();
        }, parseInt(document.getElementById("initcancelafter").value));
    }
    if (document.getElementById("initadd").checked) {
        console.log("Manually schedule() connection");
        connectionManager.schedule(connection, priority);
    }
    if (document.getElementById("initopen").checked) {
        console.log("Manually open() connection");
        connection.open();
    }
});

document.getElementById("waitingres").addEventListener("click", function () {
    const connection = connectionManager.list().filter(listItem => listItem.connection.state === AbstractConnection.INIT).last().connection;
    if (connection.state !== AbstractConnection.CLOSED) {
        connectionManager.schedule(connection, parseInt(document.getElementById("waitingresprio").value));
    }
});

window.setInterval(renew, 1000);
window.requestAnimationFrame(updateHtml);
nexttimer();