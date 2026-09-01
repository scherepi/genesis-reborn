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
    try {
        const manifest = await (await fetch("data/manifest.json")).json()
    } catch (errorLoading) {
        console.log(errorLoading);
        await loadError(errorLoading);
        return;
    }


    let appManager = new ApplicationManager();
    let windowManager = new WindowManager();

    for (application in manifest["applications"]) {
        try {
            appManager.openApp(application)
        } catch (e) {
            console.error("failed to load application data from manifest: " + e.message)
        }
    }

    document.getElementById("eyebutton").addEventListener("toggle", () => { console.log("eyebutton triggered")})
    document.getElementById("about-trigger").addEventListener("click", () => {})
    loadingOverlay.remove();
}

// called during loading if a privilege isn't detected, replaces the loading overlay with an error window
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
async function privError(reason) {
    console.log(`loading threw privilege error: ${reason}`);
    errorPopup("privilege error:", reason)
}
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
    openApp(applicationData) {
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
    constructor(options) {
        this.#numberWindows = 0;
        // options computed at load time based on screen dimensions
        if (options["defaultWindowWidth"] != undefined) { this.#globalDefaultWidth = options["defaultWindowWidth"]}
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
        let windowID = (new TextDecoder).decode(titleHash)
        let defaultWidth = this.#globalDefaultWidth;
        let defaultHeight = this.#globalDefaultHeight;
        // if the application specifies default dimensions, use those
        if (app.getOption("defaultWidth") != undefined) { defaultWidth = app.getOption("defaultWidth"); }
        if (app.getOption("defaultHeight") != undefined) { defaultHeight = app.getOption("defaultHeight"); }
        let newWindow = new Window(this, windowID, 300, 500, window.innerWidth / 3, window.innerHeight / 3)
    }
    openWindow(id) {
        this.#windowList[id].open()
        
        return new Window();
    }
}

class Window {
    #id; // unique id assigned by the WindowManager
    #element; // reference to the associated div
    #visible;
    #width;
    #height;
    #position; // 2-int tuple, corresponds to the top-left corner of the window

    constructor(windowManager, id, width, height, x, y) {
        this.#id = id;
        this.#width = width; // windowmanager will default this if it's not provided
        this.#height = height;
        this.setPosition(x, y);
    }

    open() {
        if (this.#visible) { return; } // no need to do anything
        // reset the element's position attributes as a sanity check
        this.alignCSS()
    }
    // quick utility function to set the CSS of our HTML element to align with the values set here
    alignCSS() {
        this.#element.style.width = this.#width;
        this.#element.style.height = this.#height;
        this.#element.style.left = this.#position[0];
        this.#element.style.top = this.#position[1];
        this.#visible ? this.#element.style.display = "block" : this.#element.style.display = "hidden";
    }
    setPosition(x, y) {
        this.#position = [x, y];
    }
    // used by the WindowManager to assign new z-indexes to windows
    setLayer(z) {
        this.#element.style.zIndex = z;
    }
}

class OSApplication {
    #title; // the title of this application
    #iconurl; // URL for the icon corresponding to this application
    #appSource; // the URL for the html that  serves as the source for this app
    #tooltip;
    #options; // an options object provided in the JSON
    #linkedWindow;

    static numOpen;
    constructor(title, iconurl, tooltip, options, windowManager) {
        this.#title = title;
        this.#iconurl = iconurl;
        this.#tooltip = tooltip;
        this.#options = options;
        this.#linkedWindow = windowManager.acquireWindow()
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
    associateWindow(windowObject) {
        this.#linkedWindow = windowObject;
    }
}
