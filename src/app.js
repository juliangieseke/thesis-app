


/********************************************************************
 * Code below is only for Demonstration, see README.me for more info.
 ********************************************************************/



/**
 * Import Packages (Part of Thesis)
 */
import {
  XHRConnection,
  AbstractConnection,
  ConnectionEvent
} from "@dcos/connections";
import ConnectionManager from "@dcos/connection-manager";
import AuthenticatorClass from "./Authenticator/Authenticator";

/**
 * Import external Packages (NOT part of Thesis)
 */
import { List } from "immutable";
import Util from "./Util/Util";

let Authenticator = null;

/**
 * Login
 */
document.getElementById("login").addEventListener("click", function() {
  (Authenticator && Authenticator.destroy());
  Authenticator = new AuthenticatorClass(
    "/data/stub/token.json",
    "/data/stub/token.json",
    60000,
    Util.getIntVal("tokenlifetime")
  );
  Authenticator.authenticate("username", "password");
});

/**
 * Start adding Random Noise
 */
document.getElementById("randomstop").addEventListener("click", function() {
  window.clearTimeout(Util.randtimer);
  Util.randtimer = false;
});

/**
 * Stop adding Random Noise
 */
document.getElementById("randomstart").addEventListener("click", function() {
  if (Util.randtimer) return;
  Util.nexttimer();
});

/**
 * Manually Add Request
 */
document.getElementById("initcreate").addEventListener("click", function() {
  Util.addManualRequest();
});

/**
 * update waiting request
 */
document.getElementById("waitingres").addEventListener("click", function() {
  Util.updateWaitingRequest();
});

/**
 * init
 */
Util.updateHtml();
Util.nexttimer();
Util.startInfoInterval();
