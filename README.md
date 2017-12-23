To get this working, you need to link the npm packages locally after you `npm install`ed it. the reasonbeing it relies on a certrain branch.

* https://github.com/juliangieseke/connection-manager/tree/thesis-version
* check https://github.com/dcos-labs/connections/pull/3 if it is merged. if yes, you can use master, if not, you have to use the branch.

start a simple web server (like `python3 -m http.server`) and run `npm run bundle` to build. after this you are able to open it (http://localhost:8000 as default for the python server).