

function Difficulty(name,description,posEventProbability,minNeeds,startingCash) {
    this.id = GenerateID();
    this.name = name;
    this.description = description;
    this.posEventProbability = posEventProbability;
    this.minNeeds = minNeeds;
    this.startingCash = startingCash;
}
function Location(name) {
    this.id = GenerateID();
    this.name = name;
}

function Performance(action,amount) {
    this.id = GenerateID();
    this.action = action;
    this.amount = amount;
    this.more = function() {
        this.amount = Math.min(
            this.amount+this.action.timeUnit,
            this.action.timeMax
        );
    };
    this.less = function() {
        this.amount = Math.max(
            this.amount-this.action.timeUnit,
            0
        );
        if(this.amount === 0) {
            app.state.pendingActions = app.state.pendingActions.filter((p) => {
                return p.id !== this.id;
            });
        }
    };
}
function GameEvent() {
    this.id = GenerateID();
    //TODO: Take actual data
    this.backgroundImageSrc = "images/eventBackgrounds/sampleEventBackground.jpg";
    this.backgroundImageAlt = "sample Event Background";
    this.title = "Book club";
    this.description = "The local book store is offering a membership program. For $5/month, you can get 25% off everything.";
    this.responses = [
        {name:"Join",description:"Sign up for the membership."},
        {name:"Decline",description:"Dismiss the salesperson."},
    ];
}


function getDefaultState() {
    return {
        "revision":1,
        "location":null,//TODO: default should be null to ensure we go to the game start menu
        "firstName":"John",
        "lastName":"Doe",
        "cash":500,
        "difficulty":1,
        "needs":[],
        "inventory":[],
        "pendingActions":[],
        "currentEvent":new GameEvent(),//REPLACE THIS
        "turn":1,
        "ui":{
            currentScreen:"mainMenu",
            overview: { activeNeed: null },
            schedule: { activeCat: "Rested" },
            inventory: {
                activeCat: "Work",
                activeItem:null,
                activeItemIsOwned:false,
            }
        }
    };
}

function getDefaultData() {
    return {
        "content": getContent(),
        "state": getDefaultState() //TODO: Remove this and switch back to default
    };
}

var app = new Vue({
    el: '#vueContainer',
    data: getDefaultData(),
    methods: {
        init:function(){
            this.overview_show_time();
        },
        menu_selectDifficulty: function(selection) {
            this.state.difficulty = selection;
        },
        menu_toggleNeed: function(id) {
            var t = this.state.needs.findIndex(function(t){ return t.id===id; });
            if(t === -1) { this.state.needs.push(GetObjectByID(id,this.content.needs)); }
            else { this.state.needs.splice(t,1); }
        },
        isNeedSelected: function(id) {
            return undefined !== this.state.needs.find(function(t){ return t.id===id; });
        },
        gameStart: function() {
            //TODO: Check that all selections were made
            //TODO: Set defaults
            this.toggleScreen("overview");
        },
        gameNew: function() {
            if(confirm("Are you sure you want to start a new game? Any unsaved progress will be lost.")) {
                //TODO: Clear any browser cache that would restore game?
                location.reload();
            }
        },
        gameAbout: function() { /* TODO */ },
        
        nextTurn: function() {
            //TODO: Validate that player did everything they needed to
            //
            
            //Validate time usage
            if(app.scheduledTimeCount > 168) { alert("You have scheduled too many tasks to fit in the week."); return false; }
            
            //Validate money usage
            if(!app.tryBills()) { alert("Your monthly expenses cannot be paid out of your income and cash on hand."); return false; }
            
            //TODO: Advance variables (e.g. needs, cash)
            app.doBills();
            app.serveNeeds();
            
            //TODO: Generate random events
            
            this.state.turn++;
            this.toggleScreen("overview");
        },
        
        toggleScreen:function(screenName){
            //TODO: Rest UI vars on screen draw (e.g. active item in inventory)
            if(screenName === "mainMenu") { this.state.ui.currentScreen = "mainMenu"; }
            else if(screenName === "overview") { this.state.ui.currentScreen = "overview"; }
            else if(screenName === "schedule") { this.state.ui.currentScreen = "schedule"; }
            else if(screenName === "inventory") { this.state.ui.currentScreen = "inventory"; }
            else if(screenName === "event") { this.state.ui.currentScreen = "event"; }
            else { console.log("Error: Unknown screen."); }
        },
        
        getActionDefByName:function(name) {
            for(var i = 0; i < this.content.actions.length; i++) {
                if(this.content.actions[i].name === name) { return this.content.actions[i]; }
            }
            return null;
        },
        
        rateNeed:function(n,str) {
            return (
                (str==="good" && n.value >= 0.8) ||
                (str==="iffy" && n.value < 0.8  && n.value > 0.4) ||
                (str==="bad" && n.value <= 0.4)
            );
        },
        rateTime:function(str) {
            var used = this.state.pendingActions.map(function(p){return p.amount}).reduce((acc,v) => acc+v, 0);
            //168 hours available in a week
            return (
                (str==="good" && used >= 168) ||
                (str==="iffy" && used < 168  && used > 150) ||
                (str==="bad" && used <= 150)
            );
        },
        rateMoney:function(str) {
            return (
                (str==="good" && this.state.cash >= 1000) ||
                (str==="iffy" && this.state.cash < 1000  && this.state.cash > 200) ||
                (str==="bad" && this.state.cash <= 200)
            );
        },
        overview_show_need(n) { this.state.ui.overview.activeNeed=n; },
        overview_show_money() { this.state.ui.overview.activeNeed={
            "name":"Money",
            "description":"Work for money, use it to live.",
            "help":"Get a job and be sure to work the required amount of hours. Set aside money for emergencies and try to keep your costs under control! To have better \"buy\" and \"sell\" options in your next turn, set some time in your schedule for shopping or other related tasks.",
            "hideButton":true,
        }; },
        overview_show_time() { this.state.ui.overview.activeNeed={
            "name":"Time",
            "description":"Each turn represents 1 week. Make your schedule to tend to your needs, your well being and some fun!",
            "help":"Click the \"Schedule\" button or click a need below to go to things you can do to help that need. The colors (green, yellow, red) indicate how satisfied those needs will be after you click \"Next turn\" and carry out the schedule you've planned.",
            "hideButton":true,
        }; },
        switchToActionsForNeed:function(n){
            this.state.ui.schedule.activeCat = n.name;
            this.toggleScreen("schedule");
        },
        
        addPerformance:function(actionName) {
            var index = this.state.pendingActions.map(function(p){return p.action.name;}).indexOf(actionName);
            if(index >= 0) {
                this.state.pendingActions[index].more();
            } else {
                var action = this.getActionDefByName(actionName);
                this.state.pendingActions.push(new Performance(action,action.timeUnit));
            }
            
            //this.updateSchedule();
        },
        scheduleItemMore:function(perf){ perf.more(); },
        scheduleItemLess:function(perf){ perf.less(); },
        
        
        showInventoryItem:function(item,isOwned){
            this.state.ui.inventory.activeItemIsOwned = isOwned;
            this.state.ui.inventory.activeItem = item;
            
        },
        getItemDefByName:function(n) {
            return this.content.items.filter((i) => (i.name === n))[0];
        },
        
        inventoryAdd:function() {
            let item = this.state.ui.inventory.activeItem;
            let terms = item.terms;
            
            //Try performing the transaction, return false if fail...
            //proceed to method end if true
            if(terms.type==="buy") {
                if(app.state.cash >= terms.lumpCost) {
                    app.state.cash -= terms.lumpCost ;
                } else {
                    alert("You do not have enough money!");
                    return false;
                }
            } else if(terms.type==="rent" || terms.type==="subscribe") {
                //TODO: Do we have the income for this?
            } else if(terms.type==="salary") {
                //TODO: Can I take another job?
            }
            
            app.state.inventory.push(item);
            
            this.state.ui.inventory.activeItem = null;
            
            //Remove that item from availability after purchase?
            /*
            inventoryNav[state.ui.inventory.activeCat]['available'].splice(
                inventoryNav[state.ui.inventory.activeCat]['available'].indexOf(item),
                1
            );
            */
        },
        inventoryRemove:function() {
            let item = this.state.ui.inventory.activeItem;
            let terms = item.terms;
            
            //Try performing the transaction, return false if fail...
            //proceed to method end if true
            if(terms.type==="buy") {
                //
                app.state.cash += terms.lumpCost;
            } else if(terms.type==="rent" || terms.type==="subscribe") {
                //TODO: Are their terms that prevent cancellation?
            } else if(terms.type==="salary") {
                //TODO: Are their terms that prevent cancellation?
            }
            
            //Remove that item from inventory after purchase
            app.state.inventory.splice(
                app.state.inventory.indexOf(item),
                1
            );
            
            this.state.ui.inventory.activeItem = null;
            
            //Make available to re-purchase?
            //inventoryNav[state.ui.inventory.activeCat]['available'].push(item);
        },
        
        tryBills:function() {
            var deltaCash = 0;
            var itemTerms = app.state.inventory
                .map(function(i) { return i.terms; })
                .filter(function(t) { return t.ongoingCost !== 0 && t.ongoingTurnsLeft !== 0; });
            for(var i = 0; i < itemTerms.length; i++) {
                deltaCash -= itemTerms[i].ongoingCost;
            }
            return (app.state.cash + deltaCash) > 0;
        },
        doBills:function() {
            var deltaCash = 0;
            for(var i = 0; i < app.state.inventory.length; i++) {
                if(app.state.inventory[i].terms.ongoingCost !== 0) {
                    if(app.state.inventory[i].terms.ongoingTurnsLeft !== 0) {
                        deltaCash -= app.state.inventory[i].terms.ongoingCost;
                    }
                    if(app.state.inventory[i].terms.ongoingTurnsLeft > 0) { app.state.inventory[i].terms.ongoingTurnsLeft--; }
                    if(app.state.inventory[i].terms.ongoingTurnsLeft === 0) { app.state.inventory[i].terms.ongoingCost = 0; }
                }
            }
            app.state.cash += deltaCash;
        },
        serveNeeds:function() {
            //Handle needs that demand time spent
            for(var i = 0; i < app.state.pendingActions.length; i++) {
                for(const need in app.state.pendingActions[i].action.impacts) {
                    app.serveNeed(
                        need,
                        app.state.pendingActions[i].action.impacts[need],
                        app.state.pendingActions[i].amount
                    );
                }
            }
            
            //TODO: Handle needs based on status
            
        },
        serveNeed:function(need,intensity,amount) {
            for(var i = 0; i < app.content.needs.length; i++) {
                if(app.content.needs[i].name === need) {
                    console.log("Applying "+intensity+" x "+amount+" to "+need);
                    //TODO: Apply need
                    return;
                }
            }
            console.log("Warning: Cannot find need named \""+need+"\".");
        },
    },
    computed:{
        countNeedsChosen: function() {
            return this.state.needs.length;
        },
        countNeedsNeeded: function() {
            var difficulty = GetObjectByID(this.state.difficulty,this.content.difficulties);
            if(difficulty===null) { return 0; }
            else { return difficulty.minNeeds; }
        },
        chooseableNeeds: function() {
            return this.content.needs.filter(function(t) { return t.type==="optional"; });
        },
        
        availableActions: function() {
            //Find all actions
            return this.content.actions.filter(function(action) {
                //For which at least one set of required items
                return action.requiredItemSets.filter(function(requiredItemSet) {
                    //Is in the player's inventory
                    return requiredItemSet.length===requiredItemSet.filter(function(requiredItem) {
                        var needle = [requiredItem];
                        var classMatch = app.content.itemClasses.filter(function(c) { return c.name===requiredItem.name; });
                        if(classMatch.length === 1) { needle = classMatch.items; }
                        
                        for(var i = 0; i < app.state.inventory.length; i++) {
                            for(var j = 0; j < needle.length; j++) {
                                if(app.state.inventory[i].name === needle[j]) { return true; }
                            }
                        }
                        return false;
                    }).length;
                }).length > 0;
            }).map(function(action) { return action.name; });
        },
        scheduleNav: function() {
            var nav = {  };
            var all = this.content.actions.map(function(action) {
                //Do we have to 
                return action.requiredItemSets.map(function(requiredItemSet) {
                    return {
                        name: action.name,
                        impacts: Object.keys(action.impacts),
                        reqs: requiredItemSet,
                        canDo: (requiredItemSet.length === requiredItemSet.filter(function(requiredItem) {
                            var needle = [requiredItem];
                            var classMatch = app.content.itemClasses.filter(function(c) { return c.name===requiredItem.name; });
                            if(classMatch.length === 1) { needle = classMatch.items; }
                            
                            for(var i = 0; i < app.state.inventory.length; i++) {
                                for(var j = 0; j < needle.length; j++) {
                                    if(app.state.inventory[i].name === needle[j]) { return true; }
                                }
                            }
                            return false;
                        }).length)
                    };
                });
            });
            var all2 = [];
            while(all.length > 0) { all2 = all2.concat(all.shift()); }
            all = all2; all2 = undefined;
            
            for(var i = 0; i < all.length; i++) {
                var name = all[i].name;
                var reqs = all[i].reqs;
                var canDo = all[i].canDo;
                for(var j = 0; j < all[i].impacts.length; j++) {
                    var impact = all[i].impacts[j];
                    if(typeof nav[impact] === "undefined") { nav[impact] = { doable: {}, blocked: {} }; }
                    
                    if(canDo) {
                        if(typeof nav[impact].doable[name] === "undefined") { nav[impact].doable[name] = []; }
                        nav[impact].doable[name].push(reqs);
                    } else {
                        if(typeof nav[impact].blocked[name] === "undefined") { nav[impact].blocked[name] = []; }
                        nav[impact].blocked[name].push(reqs);
                    }
                }
                
            }
            
            return nav;
        },
        scheduledTimeCount:function(){
            return this.state.pendingActions.map(function(p){return p.amount}).reduce((acc,v) => acc+v, 0)
        },
        
        
        inventoryNav: function() {
            let result = {};
            for(var i = 0; i < app.content.actions.length; i++) {
                let itemClassesForAction = getItemClassesByAction(app.content.actions[i]);
                result[app.content.actions[i].name] = {
                    "available":getMarket().filter(function(item) {
                        return itemClassesForAction.indexOf(item.name) >= 0;
                    }),
                    "have":app.state.inventory.filter(function(item) {
                        return itemClassesForAction.indexOf(item.name) >= 0;
                    }),
                };
            }
            return result;
        }
    }
});
app.init();

function applyTestState() {
    app.state.location = 1;
    app.state.needs = [
        app.content.needs[0],
        app.content.needs[1],
        app.content.needs[2],
        app.content.needs[3],
        app.content.needs[8],
    ];
    app.state.inventory = [
        new Item("Apartment"),
        new Item("Bed"),
        new Item("Bus Pass"),
        new Item("Phone"),
        new Item("Phone plan"),
        new Item("TV"),
        new Item("Netflix"),
    ];
    app.state.ui.currentScreen = "overview";
}
applyTestState();