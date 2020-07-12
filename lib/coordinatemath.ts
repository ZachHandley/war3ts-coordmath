import { Unit, Timer, Trigger, addScriptHook, Effect, File, Point, MapPlayer, Force, Rectangle } from "w3ts";
import { Players } from "w3ts/globals";
import { EventQueue, TimedEventQueue } from "wc3ts-eventqueue";
import { isNull } from "util";

const initTrigger: Trigger = new Trigger();
const chatTrigger: Trigger = new Trigger();
const buildClaim: boolean = true;                                //Building in a base claims it if nobody else is there
const claimBuildings: Number[] = [];                        //Building ID's that "claim" a base, if not-empty will make buildClaim false and only look for those buildings
const debugMode: boolean = true;                                 //Whether or not you expect to be naming and making new bases, turn off for release
const fileName: String = "coordinatemath_bases.txt"              //File to save bases to, just saves some data to a file
const fileLimit: Number = 259;                                   //Character limit for writing to a file
const buildEffectString: String = "";                            //String for the buildEffectString
const buildEffectCornerString: String = "";                      //Overly long name but this is the effect for each corner of the polygon
const baseNames: String[] = ["Peppers", "Unicorn"];              //Base names to be used in order of declaration, you can also set a base to have a certain name by clicking on it with a command
                                                                 //if not set will default to numbers
let polygonArray: Map<String, Point> = new Map();                //polygonArray is an array of all of the points we need to keep track of

function sendMessageToPlayer(toPlayer: MapPlayer, localPlayer: MapPlayer, msg: any) {
    // tslint:disable-next-line:cannot-find-name
    if(toPlayer == localPlayer) {
        let tempForce: Force = new Force();
        tempForce.addPlayer(toPlayer);
        DisplayTimedTextToForce(tempForce, 10, `${msg}`);
        tempForce.destroy();
    }
}

class Polygon {
    entrances: Point[] = [];                                     //The entrances to the base to try to better detect if a unit enters the base
    buildEffects: Map<Effect, Point> = new Map();                //Effects used between mouse points as a new base is being made
    buildEffectsCorner: Map<Effect, Point> = new Map();          //Corner Effects (polygon corners for visibility) to display a base or display corners while being built
    polyTrigger: Trigger;                                        //Trigger to register mouse events and chat events for making a base, destroyed later


    constructor(public points: Point[], public trigPlayer: MapPlayer | null) {
        if(!points.length) { //if no points it must be new right?
            if(trigPlayer !== null) { //Check if there was a player that triggered it
                this.setupNewPolygon(); //Start new polygon setup
                return;
            } else {
                return;
            }
        } else if(points.length) {
            this.setupPolygon();
            return;
        }
    }

    private setupNewPolygon() {
        this.polyTrigger = new Trigger();
        this.polyTrigger.registerPlayerChatEvent(this.trigPlayer, "-name", false);
        this.polyTrigger.addAction(() => {
            let message = GetEventPlayerChatString();
            let welcomeMessage = "New Polygon being created"
            sendMessageToPlayer(this.trigPlayer, MapPlayer.fromLocal(), welcomeMessage);
        });
    }

    private setupPolygon() {

    }

    //Given three co-linear points p, q, r, the function checks if point q lies on line segment pr
    public onSegment(segStart: Point, testPt: Point, segEnd: Point): boolean {
        if(testPt.x <= Math.max(segStart.x, segEnd.x) && testPt.x >= Math.min(segStart.x, segEnd.x) &&
        testPt.y <= Math.max(segStart.y, segEnd.y) && testPt.y >= Math.min(segStart.y, segEnd.y)) {
            return true;
        }
        return false;
    }

    //To find the orientation of ordered triplet (segStart, testPt, segEnd)
    //Returns 0 -> Points are co-linear
    //Returns 1 -> Clockwise
    //Returns 2 -> Counterclockwise
    public orientation(segStart: Point, testPt: Point, segEnd: Point): Number {
        let val = (testPt.y - segStart.y) * (segEnd.x - testPt.x) - (testPt.x - segStart.x) * (segEnd.y - testPt.y);

        if(val == 0) return 0;
        return (val > 0) ? 1 : 2; //Return 1 if val > 0, else return 2
    }

    //The function that returns true if line segment 'p1q1' and 'p2q2' intersect
    public doIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
        // Find the four orientations needed for general and special cases
        let o1: Number = this.orientation(p1, q1, p2);
        let o2: Number = this.orientation(p1, q1, q2);
        let o3: Number = this.orientation(p2, q2, p1);
        let o4: Number = this.orientation(p2, q2, q1);

        // General case
        if(o1 != o2 && o3 != o4) {
            return true;
        }

        // Special Cases
        // p1, q1, and p2 are colinear and q2 lies on segment p1q1
        if(o1 == 0 && this.onSegment(p1, q2, q1)) return true;
        
        // p1, q1, and p2 are colinear and q2 lies on segment p1q1
        if(o2 == 0 && this.onSegment(p1, q2, q1)) return true;

        // p2, q2, and p1 are colinear and p1 lies on segment p2q2
        if(o3 == 0 && this.onSegment(p2, p1, q2)) return true;

        //p2, q2, and q1 are colinear and q1 lies on segment p2q2
        if(o4 == 0 && this.onSegment(p2, q1, q2)) return true;

        return false; // Doesn't fall in any of the above cases
    }

    //Checks if a point is inside given Polygon (N > 2 points)
    public isInside(p: Point) {
        // There must be at least 3 vertices
        let numVertices = this.points.length;
        if(numVertices) return false;
        let worldBounds = Rectangle.getWorldBounds();
        let minX = worldBounds.minX();
        let maxX = worldBounds.maxX();

        //Create a point for line segment from p to infinite
        let extreme: Point = new Point(Infinity, p.y);

        //Count intersections of the above line with sides of polygon
        let count: number = 0;
        let i: number = 0;
        do {
            let next: number = (i+1)%numVertices;

            // Check if the line segment from 'p' to 'extreme' intersects
            // with the line segment from 'this.points[i]' to 'this.points[next]'
            if(this.doIntersect(this.points[i], this.points[next], p, extreme)) {
                // If the point 'p' is colinear with line segment 'i-next',
                // then check if it lies on segment. If it lies, return true, otherwise false
                if(this.orientation(this.points[i], p, this.points[next]) == 0)
                    return this.onSegment(this.points[i], p, this.points[next]);
                
                count++;
            }

            i=next;
        } while(i != 0);
        
        // Return true if count is odd, false otherwise
        return count&1;
    }

}

function addExistingBases() {

}

function onInit() {
    Players.forEach(function(value, index) {
        if(debugMode) {
            chatTrigger.registerPlayerChatEvent(value, "-newbase", false);
            chatTrigger.addAction(() => {
                newPoly: Polygon = new Polygon(true, value);
            });
        }
    });
    initTrigger.registerPlayerChatEvent()
    //initTrigger.addAction()
    
}

//addScriptHook("before:main", hook: scriptHookSignature);