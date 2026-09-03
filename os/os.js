// written by guac in august 2026.
"use strict";

async function main() {
    console.log("booting up genesis...")

    // checks, consts, and loading

    let loadingOverlay = document.getElementById("loading-overlay")

    // permission checks
    let hasStorageAccess = await document.hasStorageAccess()
    if (!hasStorageAccess) {
        await privError("sorry, your browser isn't giving me storage access - check your security settings and maybe update your browser");
        return;
    }
    let supportsPopover = Object.hasOwn(HTMLElement.prototype, "popover");
    if (!supportsPopover) {
        await privError("sorry, your browser doesn't support popovers. try updating or switching to a different browser?");
        return;
    }
    if (crypto.subtle == undefined) {
        await privError("you're not in a secure context, so we can't do crypto stuff...");
        return;
    }

    let manifest;
    try {
        manifest = await (await fetch("data/manifest.json")).json()
    } catch (errorLoading) {
        console.log(errorLoading);
        await loadError(errorLoading);
        return;
    }


    let appManager = new ApplicationManager();
    let windowManager = new WindowManager(manifest["options"]["windowManager"]);

    for (let i = 0; i < manifest["applications"].length; i++) {
        let application = manifest["applications"][i]
        try {
            appManager.loadApp(application)
        } catch (e) {
            console.error("failed to load application data from manifest: " + e.message)
        }
    }

    let eyeButton = document.getElementById("eyebutton");
    let eyeDialog = document.getElementById("eyedialog");

    // DOM attachments and interactivity
    eyeButton.addEventListener("click", () => { 
        console.log("eyebutton triggered");
        eyeDialog.showPopover();
    })
    document.getElementById("about-trigger").addEventListener("click", () => {})
    loadingOverlay.remove();
}


async function errorPopup(title, message) {
    let errorDiv = document.createElement("div");
    errorDiv.id = "errordiv"
    document.body.appendChild(errorDiv);
    let errorTitle = document.createElement("h3");
    errorTitle.innerText = title;
    errorDiv.appendChild(errorTitle)
    let errorMessage = document.createElement("p");
    errorMessage.innerText = message
    errorDiv.appendChild(errorMessage);
    let reloadDiv = document.createElement("div");
    errorDiv.appendChild(reloadDiv);
    let reloadButton = document.createElement("button");
    reloadButton.innerText = "okay reload the page for me";
    reloadButton.addEventListener("click", () => { window.location.reload(); })
    reloadDiv.appendChild(reloadButton);
} 
// called during loading if a privilege isn't detected, replaces the loading overlay with an error window
async function privError(reason) {
    console.log(`loading threw privilege error: ${reason}`);
    errorPopup("privilege error:", reason)
}
// called during loading if a resource (like manifest or an app's source) fails to load
async function loadError(reason) {
    console.log(`loading threw loading error: ${reason}`);
    errorPopup("loading error:", reason);
}

class ApplicationManager {
    #numberApplications; // the number of applications currently open
    #applicationList;
    #expectedFields;
    constructor() {
        this.#numberApplications = 0;
        this.#applicationList = []
        // these expected fields can be empty, they just can't be missing
        this.#expectedFields = ["title", "iconurl", "appSource", "tooltip", "options"]
    }
    loadApp(applicationData) {
        for (field in this.#expectedFields) {
            if (applicationData[field] == undefined) {
                throw new Error(`application data missing field ${field}`);
            }
        }
        this.#numberApplications++;
        this.applicationList.push(new OSApplication(applicationData))
    }
}

class WindowManager {
    #numberWindows;
    #windowList;
    #globalDefaultWidth;
    #globalDefaultHeight;
    #highestZ; // the z-index for the current highest-stacked window
    constructor(options) {
        this.#numberWindows = 0;
        this.#windowList = new Map();
        // options computed at load time based on screen dimensions
        if (options["defaultWindowWidth"] != undefined) { this.#globalDefaultWidth = options["defaultWindowWidth"]; }
        else { this.#globalDefaultWidth = 500}
        if (options["defaultWindowHeight"] != undefined) { this.#globalDefaultHeight = options["defaultWindowHeight"]; }
        else { this.#globalDefaultHeight = 300}
        this.#highestZ = 10; // to provide a little bit of allowance for elements behind and underneath
    }
    getWindows() {
        return this.windowList
    }
    getNumOpen() {
        return this.#numberWindows;
    }
    // used by applications to reserve a window from the window manager - they're then made visible with openWindow
    async acquireWindow(app) {
        this.#numberWindows += 1;
        let titleHash = await crypto.subtle.digest("SHA-256", (new TextEncoder).encode(app.getTitle()))
        let windowID = (new TextDecoder).decode(titleHash).slice(0, 7) + "-" + (this.#numberWindows).toString()
        let defaultWidth = this.#globalDefaultWidth;
        let defaultHeight = this.#globalDefaultHeight;
        // if the application specifies default dimensions, use those
        if (app.getOption("defaultWidth") != undefined) { defaultWidth = app.getOption("defaultWidth"); }
        if (app.getOption("defaultHeight") != undefined) { defaultHeight = app.getOption("defaultHeight"); }
        this.#highestZ++;
        let startingZ = this.#highestZ;
        let newWindow = new OSWindow(this, windowID, defaultWidth, defaultHeight, startingZ, window.innerWidth / 3, window.innerHeight / 3);
        this.#windowList.set(windowID, newWindow);
        return newWindow;
    }
    openWindow(id) {
        this.#windowList[id].open();
    }
    closeWindow(id) {
        this.#windowList.remove()
    }
}

class OSWindow {
    #id; // unique id assigned by the WindowManager
    #element; // reference to the associated div
    #visible;
    #width;
    #height;
    #zIndex;
    #styles;
    #position; // 2-int tuple, corresponds to the top-left corner of the window

    constructor(windowManager, id, width, height, startingZ, styles, x, y) {
        this.#id = id;
        this.#width = width; // windowmanager will default this if it's not provided
        this.#height = height;
        this.#zIndex = startingZ
        this.#styles = styles;
        this.setPosition(x, y);
    }

    createElement() {
        let windowDiv = document.createElement("div");
        windowDiv.id = this.#id;
        let windowBar = document.createElement("div");
        let closeButton = document.createElement("p");
        let minimizeButton = document.createElement("p");
        let maximizeButton = document.createElement("p")
    }

    open() {
        if (this.#visible) { return; } // no need to do anything
        // otherwise, change it to true and trigger a CSS realignment
        this.#visible = true;
        this.alignCSS()
    }
    // quick utility function to set the CSS of our HTML element to align with the values set here
    alignCSS() {
        this.#element.style.width = this.#width;
        this.#element.style.height = this.#height;
        this.#element.style.left = this.#position[0];
        this.#element.style.top = this.#position[1];
        this.#element.style.zIndex = this.#zIndex;
        this.#visible ? this.#element.style.display = "block" : this.#element.style.display = "hidden";
    }
    setPosition(x, y) {
        this.#position = [x, y];
    }
    // used by the WindowManager to assign new z-indexes to windows
    setLayer(z) {
        this.#zIndex = z;
        this.#element.style.zIndex = z;
    }
    setStyle(customStyle) {
        // customStyle is an array where the first index is the key and the second value is the value for a CSS rule
        this.#element.style[customStyle[0]] = customStyle[1];
    }
}

class OSApplication {
    #title; // the title of this application
    #iconurl; // URL for the icon corresponding to this application
    #appSource; // the URL for the html that  serves as the source for this app
    #tooltip; // the tooltip displayed when mousing over this application tiled on the desktop
    #options; // an options object provided in the JSON
    #styles; // an optional styles object defining custom CSS for this app's windows
    #linkedWindows; // a list of window IDs provided by the WindowManager

    static numOpen;
    constructor(title, iconurl, tooltip, options, styles, windowManager) {
        this.#title = title; 
        this.#iconurl = iconurl;
        this.#tooltip = tooltip;
        this.#options = options;
        this.#styles = styles
        this.#linkedWindows[0] = windowManager.acquireWindow()
    }

    // standard getters
    getTitle() {
        return this.#title;
    }
    getIcon(){
        return this.#iconurl;
    }

    getOption(optionName) {
        // returns undefined if an option is not set!
        return this.#options[optionName] 
    }

    getStyles() {
        // returns undefined if there are no custom styles set for this application
        return this.#styles;
    }

    async registerWindow(windowManager) {
        this.#linkedWindows.push(await windowManager.acquireWindow(this))
    }
    
}

main();