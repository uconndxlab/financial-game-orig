var LastGeneratedID = 0;
function GenerateID() { LastGeneratedID++; return LastGeneratedID; }
function GetObjectByID(id,set) {
    for(var i = 0; i < set.length; i++) { if(set[i].id===id) { return set[i]; } }
    return null;
}

//////////////////////////////////////////////////
//Items
// ItemClass describes sets of things that can enable the user to perform the
// same actions. When a particular item leaves a field blank, it progressively
// moved up the `mainClass` chain parent by parent until it can fill it in.
function ItemClass(name,abstract,children,terms,efficiency) {
    this.name = name;
    this.children = (children ? children : []); //You define this by name, but at start the correct item to point to is calculated
    this.terms = terms; if((terms===null || terms===undefined) && (!abstract)) { console.log("Item classes without terms must be abstract."); }
    this.efficiency = efficiency;
    this.getAllChildren = function() {
        return this.children
            .map(function(c){ return c.getAllChildren(); })
            .reduce(function(acc,cur) { return acc.concat(cur); }, [])
            .push(this.name);
    };
    this.parent = null; //This is automatically filled in based on children at program start
    this.getParentChain = function() {
        if(this.parent === null) { return [this.name]; }
        else { return this.parent.getParentChain().push(this.name); }
    }
    this.abstract = (abstract===true);
    this.instantiate = function(modifications) {
        if(this.abstract) { throw "Cannot instantiate abstract class."; }
        var o = new Item(this.name,this.name,this.description,this.getParentChain(),this.terms.instantiate(),this.efficiency);
        if(typeof modifications === "undefined") { for(var k in modifications) {
            o[k] = modifications[k];
        } }
        return o;
    };
}

//Item term types indicate the kinds of ownership/payment relationships an
//item can have. The text field (e.g. add, remove) is used in UI, but setting
//it to false will make that UI action unavailable.
var ItemTermTypes = {
    "buy": { "add": "Buy", "remove": "Sell" },
    "rent": { "add": "Rent", "remove": "Cancel" },
    "subscribe": { "add": "Subscribe", "remove": "Unsubscribe" },
    "salary": { "add": "Take job", "remove": "Quit" },
    //loan, lease, etc.
};

// `ItemTerms` defines the financial arrangement for a particular item the you
// If the type is salary, the "ongoing cost" should be negative
function ItemTerms(type,lump,ongoingCost,ongoingTurnsLeft) {
    this.type = type;//See "getTerminateTermonolgoy: Ex: buy,rent,subscribe,salary
        //Types shouln't change, so we can compute these at the time, right?
        //alert(this.type + "" +  ItemTermTypes[this.type]);
        this.uitextAcquire = ItemTermTypes[this.type].add;
        this.uitextTerminate = ItemTermTypes[this.type].remove;
    this.lumpCost = (lump ? lump : 0);
    this.ongoingCost = (ongoingCost ? ongoingCost : 0);
    if(ongoingTurnsLeft) { this.ongoingTurnsLeft = ongoingTurnsLeft; }//-1 for infinite
        else if(this.ongoingCost) { this.ongoingTurnsLeft = -1; }
        else { this.ongoingTurnsLeft = 0; }
    this.transactionDate = null;
    this.depreciation = 0.15;
    this.instantiate = function() { return Object.assign({}, this); /*Shallow copy*/ }
}
// `Item` describes a specific unique instance that a player has or is being
// offered. `mainClass` is required and is the generalization of the item in
// question. Things left null will be filled in using the `mainClass`. 
function Item(mainClassName,name,classes,terms,efficiency) {
    mainClass = getClassByName(mainClassName);
    this.mainClass = mainClass;
    this.name = (name ? name : mainClass.name);
    this.classes = (classes ? classes : mainClass.classes);
    this.efficiencyMultiplier = (efficiency ? efficiency : 1); //How much better does it work than the average item in its class
    this.terms = (terms ? terms : mainClass.terms);
}

function getClassByName(name) {
    return (app.content.itemClasses[name] ? app.content.itemClasses[name] : null);
}

//Uses the class definitions to know what is available, but generates an
//array of Items instead so that they represent tangible, non-abstract
//things.
function getMarket() {
    let items = [];
    for(const name in app.content.itemClasses) {
        if(!app.content.itemClasses[name].abstract) {
            items.push(new Item(name));
        }
    }
    return items;
}

//Class defs is an array whose keys are names of classes and values are the
//class object
function getItemClassDefs() {
    var toAdd = [
        new ItemClass("TV Source",true,["Netflix","Cable","Antenna"],null,1),
        new ItemClass("Internet Source",true,["Cable"],null,1),
        new ItemClass("Internet Client",true,["Computer"],null,1),
        
        new ItemClass("Job",false,[],new ItemTerms("salary",0,-1000),1),
        new ItemClass("Apartment",false,[],new ItemTerms("rent",0,250),1),
        new ItemClass("Bed",false,[],new ItemTerms("buy",500,0),1),
        new ItemClass("Bus Pass",false,[],new ItemTerms("subscribe",0,5),1),
        new ItemClass("Phone",false,[],new ItemTerms("buy",200,0),1),
        new ItemClass("Phone plan",false,[],new ItemTerms("subscribe",0,50),1),
        new ItemClass("Sewing book",false,[],new ItemTerms("buy",20,0),1),
        new ItemClass("Sewing kit",false,[],new ItemTerms("buy",50,0),1),
        new ItemClass("TV",false,[],new ItemTerms("buy",300,0),1),
        new ItemClass("Computer",false,[],new ItemTerms("buy",600,0),1),
        new ItemClass("Netflix",false,[],new ItemTerms("subscribe",0,10),1),
        new ItemClass("Cable",false,[],new ItemTerms("subscribe",0,80),1),
        new ItemClass("Antenna",false,[],new ItemTerms("buy",20,0),1),
    ];
    //Hook up parents/children
    var classes = [];
    while(toAdd.length > 0) {
        var n = toAdd.pop();
        classes[n.name] = n;
    }
    for(const name in classes) {
        let parentName = classes[name].parent;
        classes[name].parent = classes[parentName];
        
        let childObjs = [];
        while(classes[name].children.length > 0) {
            let childName = classes[name].children.pop();
            childObjs.push(classes[childName]);
        }
        classes[name].children = childObjs;
    }
    return classes;
}
function getItemDefs(classes) {
    //TODO: For now, I start by instantiating one copy of any non-abstract class
    //Down the line that probably won't make much sense.
    return classes
        .filter(function(c){ return !c.abstract; })
        .map(function(c){ return c.instantiate(); });
}

//////////////////////////////////////////////////
//Actions
function Action(name,requiredItemSets,impacts,timeUnit,timeMax,requiresTransportation) {
    this.id = GenerateID();
    this.name = name;
    //requiredItems is an array of arrays where each array is one set of items that would enable the action to be performed
    this.requiredItemSets = requiredItemSets;
    this.impacts = impacts;
    
    this.timeUnit = timeUnit;
    this.timeMax = (timeMax===null?Number.MAX_SAFE_INTEGER:timeMax);
    
    this.requiresTransportation = requiresTransportation;
}
function getActionDefs() { return [
    new Action("Work",[
        ["Job"]
    ],{"Work Performance":0.2},1,null,true),
    
    new Action("Go shopping",[
        []
    ],{"Undefined": 1},0.5,null,true),

    new Action("Sleep",[
        [],
        ["Bed"]
    ],{"Rested":0.5},1,null,false),

    new Action("Watch TV",[
        ["TV","TV Content Source"]
    ],{"Entertained":1},0.5,null,false),
    new Action("Read",[
        ["Sewing book"]
    ],{"Entertained":1},0.5,null,false),
    
    new Action("Chat with friend",[
        ["Phone","Phone plan"]
    ],{"Socialized":0.85},0.5,null,false),
    new Action("Visit friend",[
        ["Bus Pass"]
    ],{"Socialized":1},0.5,null,true),
    
    new Action("Repair clothing",[
        ["Sewing kit"]
    ],{"Learned":1},0.5,null,false),
]; }
function getItemClassesByAction(action) {
    var results = {};
    for(var i = 0; i < action.requiredItemSets.length; i++) {
        for(var j = 0; j < action.requiredItemSets[i].length; j++) {
            results[action.requiredItemSets[i][j]] = true;
        }
    }
    return Object.keys(results);
}

//////////////////////////////////////////////////
// Needs
function Need(name,type,description) {
    this.id = GenerateID();
    this.name = name;
    this.type = type;
    this.description = description;
    this.value = 0.8; //This is how well the player tended to it
    this.help = "This is placeholder text. In the future, each need would have basic hints about how to tend to the need. For example, if this need was about being rested, we might mention that the sleep action is a good go to.";
}
function getNeedDefs() { return [
    //Required
    new Need("Rested","required","You need sleep."),
    new Need("Fed","required","You need to eat."),
    new Need("Entertained","required","You need some entertainment."),
    new Need("Socialized","required","You need some socialization."),

    //Optional
    new Need("Introverted","optional","\"Do not disturb\" signs are a must."),
    new Need("Extroverted","optional","Socialization works wonders for you."),
    new Need("Nutritionist","optional","It'll get under your skin to be stuck eating processed foods."),
    new Need("Pop culture junky","optional","You just have to be in on latest celebrity buzz."),
    new Need("Trimmed and polished","optional","Your hair and your skin better look perfect before you go outside!"),
    new Need("Fashionable","optional","An aged or tattered wardrobe belongs in the trash."),
    new Need("Easily bored","optional","Doing the same thing every week gets old fast."),
    new Need("Animal lover","optional","Pets are a must for you."),
    new Need("Caffeine addict","optional","The world's not ready for the day you wake up without coffee."),
    new Need("Smoker","optional","You're stuck in the habit."),
    new Need("Cold-blooded","optional","Is the heat on? Are you sure?"),
    new Need("Gamer","optional","There's one way to unwind."),
    new Need("Giver","optional","The world tugs at your heart."),
    new Need("Independent","optional","It drives you crazy to relying on others."),

    //Temporary
    new Need("Depressed","temporary","Failing to meet your needs has taken its toll. (-1 for all needs)"),
    
    new Need("Career","",""),
    new Need("Pet care","",""),
    new Need("Nutrition","",""),
]; }

//////////////////////////////////////////////////
//Events
function Event(title,description,trigger,ignoreable,options,cssClass) {
    this.id = GenerateID();
    this.title = name;
    this.description = description;
    this.template = (cssClass ? cssClass : "");//This can override the template to impact how the display text shows, if there is a background, etc.
    this.trigger = (trigger ? trigger : new EventTrigger());
    this.options = options;
    
    if(ignoreable) { this.options.push(new EventOption("Skip", function(){})); }
}
function EventOption(name,action) {
    this.name = name;
    this.action = action;
}
function EventTrigger(requiredItems, frequency, cooldown, requirementsFun) {
    this.frequency = (frequency ? frequency : "sometimes");//always, somtimes, rarely
    this.cooldown = (cooldown ? cooldown : 10);//Number of turns before this event can happen again, -1 for never
    this.requiredItems = (requiredItems ? requiredItems : []);//An array of arrays of item classes that you must have for this event to happen
    this.requirementsFun = (requirementsFun ? requirementsFun : function(){return true;});//A boolean function that tests when this event can trigger
}
function getEventDefs() { return [
    new Event("Library Giveaway", "The library is giving away some free books to clear up some shelves for the new.", null, true, [new EventOption("Grab a book")]),
]; }

//////////////////////////////////////////////////
//Root content collector
function getContent() {
    var itemClasses = getItemClassDefs();
    var items = getItemDefs(itemClasses);
    
    return {
        "revision":"1",
        "locations":[
            new Location("Hartford, CT"),
        ],
        "items":items,
        "itemClasses":itemClasses,
        "actions":getActionDefs(),
        "events":getEventDefs(),
        "needs":getNeedDefs(),
        "difficulties":[
            new Difficulty("Casual","Can you manage not to starve?",0.75,0,24000),
            new Difficulty("Normal","Life's a little complicated.",0.50,4,6000),
            new Difficulty("Disheartening","Sometimes, it feels like the world is against you.",0.25,8,1500)
        ]
    };
}