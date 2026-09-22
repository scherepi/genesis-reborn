// code for the title screen of the genesis revamp written by guac
// hack club rocks

console.log("reborn at last")

const eyeScale = 0.5;

let mouseFollower = document.createElement("div");
document.body.appendChild(mouseFollower);
mouseFollower.id = "follower";
document.addEventListener("mousemove", (ev) => {
    mouseFollower.style.top = ev.clientY + "px";
    mouseFollower.style.left = ev.clientX + "px";
})

// messing around with a generator function:
function* ellipsis() {
    while (true) {
        yield ".";
        yield "..";
        yield "...";
    }
}
let gen = ellipsis();
setInterval(() => {
    document.querySelector("#enter p").innerText = "enter" + gen.next().value;
},1000)

document.getElementById("enter").addEventListener("click", (ev) => {
    window.location.assign("/os/")
})

let eyes = 0;

let eyeblink = (x, y, angle) => {
    eyes++;
    eyeImg = document.createElement("img");
    eyeImg.src = "./assets/eye.png"
    eyeImg.classList.add("blinkeye");
    // these have already been put in the pixel unit
    eyeImg.style.top = y; 
    eyeImg.style.left = x;
    eyeImg.style.transform = `scale(${eyeScale}) rotateZ(${angle})`;
    document.body.appendChild(eyeImg);
    void eyeImg.offsetWidth; // force a style recalculation
    eyeImg.classList.add("trigger");
    setTimeout(() => {
        eyeImg.remove();
        eyes--;
    }, 3000)
}

setInterval( () => {
    let eyeX = Math.floor(Math.random() * window.innerWidth);
    let eyeY = Math.floor(Math.random() * window.innerHeight);
    let randomAngle = Math.floor(Math.random() * 360);

    eyeblink(eyeX + "px", eyeY + "px", randomAngle + "deg");
}, eyes > 5 ? 1500 : 4000);