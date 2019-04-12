const appId = "testing";
const socketURL = `ws://t2k.azurewebsites.net/painter.ashx?appid=${appId}`;
let socket = null;

let canvas = null;
let ctx = null;
let color = null;

let plotsByUser = {};
let userDrawing = [];

let isActive = false;
let plots = [];

let User = "";


let welcomePage = `
<div class="login">
    <h1>Login</h1>
    <form id="loginForm">
        What is you name?<br/>
        <input name="name">
        <br/>
        <br/>
        <button type="submit" style="margin-left: calc(50% - 21px);">Enter</button>
    </form>
</div>
`;


let canvasPage = `
<div class="container">
    <div class="header"></div>
    <div class="user-list" id="userList">Peers</div>
    <div class="canvas-container">
        <canvas id="drawCanvas" width="100%" height="100%">Canvas is not supported on this browser!</canvas>
    </div>

    <div id="colorSwatch">
        <input type="radio" name="color" id="color07" data-color="black" checked> <label for="color07"></label>
        <input type="radio" name="color" id="color01" data-color="gold"><label for="color01"></label>
        <input type="radio" name="color" id="color02" data-color="darkorange"> <label for="color02"></label>
        <input type="radio" name="color" id="color03" data-color="navy"> <label for="color03"></label>
        <input type="radio" name="color" id="color04" data-color="yellowgreen"> <label for="color04"></label>
        <input type="radio" name="color" id="color05" data-color="firebrick"> <label for="color05"></label>
        <input type="radio" name="color" id="color06" data-color="powderblue"> <label for="color06"></label>
        <input type="radio" name="color" id="color08" data-color="red"> <label for="color08"></label>
        <input type="radio" name="color" id="color09" data-color="blue"> <label for="color09"></label>
        <input type="radio" name="color" id="color10" data-color="green"> <label for="color10"></label>
        <input type="radio" name="color" id="color11" data-color="gray"> <label for="color11"></label>
        <input type="radio" name="color" id="color12" data-color="purple"> <label for="color12"></label>
        <button onclick="clearCanvas()">Clear</button>
    </div>
</div>
`;

function submitUsername(event) {
    const e = event || window.event;
    e.preventDefault();

    if (event.target.name.value !== "") {
        User = event.target.name.value;
        plotsByUser[User] = [];
        document.getElementById("loginForm").removeEventListener("submit", submitUsername);
        let div = document.createElement('div');
        div.className = "login-container";
        div.innerHTML = canvasPage.trim();
        document.body.removeChild(document.getElementById("login"))
        document.body.appendChild(div);
        document.getElementsByClassName("header")[0].innerHTML = `Hello ${User}`;

        initializeWebStocket();
        initializeCanvas();
    }
}


function initializeWebStocket() {
    socket = new WebSocket(socketURL);

    socket.addEventListener('open', function (event) {
        let req = {type: "newUser", name: User}
        socket.send(JSON.stringify(req));
    });

    // Listen for messages
    socket.addEventListener('message', function (event) {
        let data = JSON.parse(event.data);
        console.log(data);
        handleNetworkRequests(data);
    });
}


function handleNetworkRequests(data) {
    switch (data.type) {
        case "newUser": {
            plotsByUser[data.name] = [];
            let req = {type: "UsersList", allUser: plotsByUser};
            updateUserList();
            socket.send(JSON.stringify(req));
            break;
        }
        case "UsersList": {
            plotsByUser = data.allUser;
            updateUserList();
            updateCanvas();
            break;
        }
        case "drawing": {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            plotsByUser[data.user] = data.plots;
            updateCanvas();
            break;
        }
        default:
            return

    }
}

function updateCanvas() {
    Object.keys(plotsByUser).forEach((user) => {
        plotsByUser[user].forEach((plot) => {
            drawOnCanvas(plot.color, plot.plots)
        })
    })

}

function initializeCanvas() {
    canvas = document.getElementById('drawCanvas');
    ctx = canvas.getContext('2d');
    color = document.querySelector(':checked').getAttribute('data-color');

    isActive = false;
    plots = [];

    const isTouchSupported = 'ontouchstart' in window;
    const isPointerSupported = navigator.pointerEnabled;
    const isMSPointerSupported = navigator.msPointerEnabled;

    const downEvent = isTouchSupported ? 'touchstart' : (isPointerSupported ? 'pointerdown' : (isMSPointerSupported ? 'MSPointerDown' : 'mousedown'));
    const moveEvent = isTouchSupported ? 'touchmove' : (isPointerSupported ? 'pointermove' : (isMSPointerSupported ? 'MSPointerMove' : 'mousemove'));
    const upEvent = isTouchSupported ? 'touchend' : (isPointerSupported ? 'pointerup' : (isMSPointerSupported ? 'MSPointerUp' : 'mouseup'));

    canvas.addEventListener(downEvent, startDraw, false);
    canvas.addEventListener(moveEvent, draw, false);
    canvas.addEventListener(upEvent, endDraw, false);

    document.getElementById('colorSwatch').addEventListener('click', function () {
        color = document.querySelector(':checked').getAttribute('data-color');
    }, false);


    const cs = getComputedStyle(document.getElementsByClassName("canvas-container")[0]);
    canvas.width = parseInt(cs.getPropertyValue('width'), 10);
    canvas.height = parseInt(cs.getPropertyValue('height'), 10);

    ctx.lineWidth = '1';
    ctx.strokeStyle = color;
    // ctx.strokeStyle = "#000";

    // Set Background Color
    // ctx.fillStyle="#fff";
    // ctx.fillRect(0,0,canvas.width,canvas.height);

}

function drawOnCanvas(color, plots) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(plots[0].x, plots[0].y);
    for (let i = 1; i < plots.length; i++) {
        ctx.lineTo(plots[i].x, plots[i].y);
    }
    ctx.stroke();
}

function draw(e) {
    if (!isActive) return;
    // cross-browser canvas coordinates
    const x = e.offsetX || e.layerX - canvas.offsetLeft;
    const y = e.offsetY || e.layerY - canvas.offsetTop;
    plots.push({x: x, y: y});
    drawOnCanvas(color, plots);
}

function startDraw(e) {
    isActive = true;
}

function endDraw(e) {
    isActive = false;
    userDrawing.push({color: color, plots: plots});
    plotsByUser[User] = userDrawing;
    let updatedPlots = {type: "drawing", plots: userDrawing, user: User}
    socket.send(JSON.stringify(updatedPlots));
    // empty the array
    plots = [];
}


function updateUserList() {
    let userList = document.getElementById("userList");
    userList.innerHTML = "";
    userList.insertAdjacentHTML("afterbegin", `<div>Peers</div>`);
    Object.keys(plotsByUser).forEach((el) => {
        if (el !== User) {
            userList.insertAdjacentHTML("beforeend", `<div>${el}</div>`)
        }
    })
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    isActive = false;
    userDrawing = [];
    plots = [];
    plotsByUser[User] = []
    let updatedPlots = {type: "drawing", plots: userDrawing, user: User};
    updateCanvas();
    socket.send(JSON.stringify(updatedPlots));
}


(function () {
    let div = document.createElement('div');
    div.className = "login-container";
    div.id = "login";
    div.innerHTML = welcomePage.trim();
    document.body.appendChild(div);

    document.getElementById("loginForm").addEventListener("submit", submitUsername)

})();
