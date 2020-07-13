import { Point, Rectangle } from "w3ts";

const debugMode: boolean = false;                                 //Whether or not you expect to be naming and making new bases, turn off for release
const circleVertices: number = 30;

export class Polygon {
    public static polygonArray: Polygon[] = [];
    public name: string = "";
    index: number;

    constructor(public points: Point[]) {
        this.index = Polygon.polygonArray.length;
        Polygon.polygonArray[this.index] = this;
    }

    public addPoint(p: Point) {
        this.points.push(p);
    }

    public addPoints(p: Point[]) {
        p.forEach(element => {
            this.points.push(element);
        });
    }

    public delPoint(p: Point) {
        let length: number = this.points.length;
        if(length > 1) {
            let index:number = this.points.indexOf(p);
            this.points[index] = this.points[this.points.length-1];
            this.points.pop();
        } else {
            this.points = [];
        }
    }

    public delPoints(p: Point[]) {
        let length: number = this.points.length;
        p.forEach(point => {
            if(length > 1) {
                let index:number = this.points.indexOf(p);
                this.points[index] = this.points[this.points.length-1];
                this.points.pop();
                length--;
            } else {
                this.points = [];
            }
        });
    }

    public clear() {
        this.points = [];
    }

    public destroy(): void {
        let length: number = Polygon.polygonArray.length;
        if(length > 1) {
            let index:number = Polygon.polygonArray.indexOf(this);
            Polygon.polygonArray[index] = Polygon.polygonArray[Polygon.polygonArray.length-1];
            Polygon.polygonArray.pop();
        }

    }

    //Given three co-linear points p, q, r, the function checks if point q lies on line segment pr
    onSegment(segStart: Point, testPt: Point, segEnd: Point): boolean {
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
    orientation(segStart: Point, testPt: Point, segEnd: Point): number {
        let val = (testPt.y - segStart.y) * (segEnd.x - testPt.x) - (testPt.x - segStart.x) * (segEnd.y - testPt.y);

        if(val == 0) return 0;
        return (val > 0) ? 1 : 2; //Return 1 if val > 0, else return 2
    }

    //The function that returns true if line segment 'p1q1' and 'p2q2' intersect
    doIntersect(p1: Point, q1: Point, p2: Point, q2: Point): boolean {
        // Find the four orientations needed for general and special cases
        let o1: number = this.orientation(p1, q1, p2);
        let o2: number = this.orientation(p1, q1, q2);
        let o3: number = this.orientation(p2, q2, p1);
        let o4: number = this.orientation(p2, q2, q1);

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
        let numVertices: number = this.points.length;
        if(numVertices < 2) return false;
        let worldBounds = Rectangle.getWorldBounds();
        let minX = worldBounds.minX;
        let maxX = worldBounds.maxX;

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

    public static count(): number {
        return Polygon.polygonArray.length;
    }

    public static getArray(): Polygon[] {
        return Polygon.polygonArray;
    }

    public static clearAll() {
        Polygon.polygonArray = [];
    }
    

}

export function createCircle(center: Point, radius: number): Polygon {
    let circle = new Polygon([]);
    let centerX = center.x;
    let centerY = center.y;
    let radians: number = Math.PI / circleVertices;
    for (let index = 0; index < circleVertices; index++) {
        let pX = center.x + radius * Sin(radians * index);
        let pY = center.y + radius * Cos(radians * index);
        const pt: Point = new Point(pX, pY);
        circle.addPoint(pt);
    }
    return circle;
}