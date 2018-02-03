import {
  XHRConnection,
  AbstractConnection,
  ConnectionEvent
} from "@dcos/connections";
import { default as ConnectionManager } from "@dcos/connection-manager";

export default class Authenticator {
  constructor(
    loginUrl = "/data/stub/token.json",
    renewUrl = "/data/stub/token.json",
    buffer = 60000, // 60s
    maxTimeout = 120000 // 2m
  ) {
    const context = {
      instance: this,
      loginUrl,
      renewUrl,
      connection: null,
      buffer,
      maxTimeout,
      timeout: null,

      handleComplete(event) {
        {
          const connection = event.target;
          const token = connection.response.token.replace(/\"/g, "");
          const expire =
            parseInt(JSON.parse(atob(token.split(".")[1])).exp) * 1000;
          const timeout = Math.min(
            this.maxTimeout,
            expire - Date.now() - this.buffer
          );

          window.clearTimeout(this.failTimeout);
          
          console.log(
            `Authenticator~handleComplete: Request completed, recieved Token.`
          );

          if (timeout < 0) {
            console.warn("Authenticator~handleComplete: Short token timeleft!");
            timeout = 0;
          }

          console.log(
            `Authenticator~handleComplete: Setup renewal in ${Math.round(
              timeout / 1000
            )}s`
          );
          this.timeout = window.setTimeout(this.renew, timeout);

          console.log("Authenticator~handleComplete: Storing the Token");
          ConnectionManager.storeToken(token);

          // free connection
          this.connection = null;
        }
      },
      renew() {
        if (this.connection !== null) {
          throw new Error(
            "Renewal in progress! This is only a Prototype, please reload the page."
          );
        }

        console.log("Authenticator~renew: Starting token renewal.");
        this.failTimeout = window.setTimeout(function() {
          throw new Error(
            "Token renwal not finished in time! This is only a Prototype, please reload the page."
          );
        }, this.buffer);

        this.connection = new XHRConnection(this.renewUrl)
          .on(ConnectionEvent.ERROR, () => {
            throw new Error(
              "Renewal failed! This is only a Prototype, please reload the page."
            );
          })
          .on(ConnectionEvent.COMPLETE, this.handleComplete);

        // Schedule in Connection Manager
        ConnectionManager.schedule(this.connection, 4);
      }
    };

    // bind methods
    context.handleComplete = context.handleComplete.bind(context);
    context.renew = context.renew.bind(context);

    this.authenticate = this.authenticate.bind(context);
    this.destroy = this.destroy.bind(context);
  }
  authenticate(uid, password) {
    console.log("Authenticator~authenticate: Logging in…");

    // this will _not_ be a get request - just for the demo
    this.connection = new XHRConnection(
      this.loginUrl + `?uid=${uid}&password=${password}`
    )
      .on(ConnectionEvent.OPEN, () => {
        console.log("Authenticator~authenticate: Request started…");
      })
      .on(ConnectionEvent.ERROR, () => {
        // only for demonstration, should have proper error handling…
        throw new Error(
          "Login failed! This is only a Prototype, please reload the page."
        );
      })
      .on(ConnectionEvent.COMPLETE, this.handleComplete);

    // Schedule in Connection Manager
    ConnectionManager.schedule(this.connection, 4);
  }

  destroy() {
    console.log(`Authenticator~destroy: deleting stored token ("logout")`);
    clearTimeout(this.timeout);
    this.timeout = null;
    ConnectionManager.storeToken(null);
  }
}
