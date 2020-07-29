import { Client, Room } from "colyseus";
import {
    Component,
    Entity,
    State,
    System,
    TagComponent,
    World,
} from "@colyseus/ecs";
import { Schema, type } from "@colyseus/schema";

const SPEED_MULTIPLIER = 0.3;
const SHAPE_SIZE = 50;
const SHAPE_HALF_SIZE = SHAPE_SIZE / 2;

// Initialize canvas
let window = { innerWidth: 800, innerHeight: 600 };
let canvas = { width: 800, height: 600 };
let canvasWidth = (canvas.width = window.innerWidth);
let canvasHeight = (canvas.height = window.innerHeight);

// Player information component
class Network extends Component<any> {
    @type("string") cName: string = this.constructor.name;
    @type("string") sessionId: string;
    @type("int64") networkId: number;
}

// Velocity component
class Velocity extends Component<any> {
    @type("string") cName: string = this.constructor.name;
    @type("number") x: number;
    @type("number") y: number;
}

// Position component
class Position extends Component<any> {
    @type("string") cName: string = this.constructor.name;
    @type("number") x: number;
    @type("number") y: number;
}

class Shape extends Component<any> {
    @type("string") cName: string = this.constructor.name;
    @type("string") primitive: string = "circle";
    @type("string") color: string;
    @type("uint8") radius: number = 10;
}

// Renderable component
class Renderable extends TagComponent {
    @type("string") cName: string = this.constructor.name;
}

// MovableSystem
class MovableSystem extends System {
    static queries = {
        moving: {
            components: [Velocity, Position],
        },
    };
    // This method will get called on every frame by default
    execute(delta, time) {
        // Iterate through all the entities on the query
        this.queries.moving.results.forEach((entity) => {
            var velocity = entity.getComponent(Velocity);
            var position = entity.getMutableComponent(Position);
            position.x += velocity.x * delta;
            position.y += velocity.y * delta;

            if (position.x > canvasWidth + SHAPE_HALF_SIZE)
                position.x = -SHAPE_HALF_SIZE;
            if (position.x < -SHAPE_HALF_SIZE)
                position.x = canvasWidth + SHAPE_HALF_SIZE;
            if (position.y > canvasHeight + SHAPE_HALF_SIZE)
                position.y = -SHAPE_HALF_SIZE;
            if (position.y < -SHAPE_HALF_SIZE)
                position.y = canvasHeight + SHAPE_HALF_SIZE;
        });
    }
}

export class EcsDemoRoom extends Room {
    world: World; // Has a world.state with the entities array
    sessionIdToEntityMap = new Map<string, Entity>();
    entityIdToEntity = new Map<number, Entity>();
    onCreate() {
        // Create world and register the components and systems on it
        var world = new World();

        // Create Schema state, and assign entities array to it.
        const state = new State();
        this.world = world;
        world.useEntities(state.entities);
        world
            .registerComponent(Network)
            .registerComponent(Velocity)
            .registerComponent(Position)
            .registerComponent(Shape)
            .registerComponent(Renderable)
            .registerSystem(MovableSystem);

        this.onMessage("self-radius", (client, data) => {
            console.log(
                "Ecs-room received message from",
                client.sessionId,
                ":",
                data
            );
            // Todo: Write me
            this.state.changeRadius(client.sessionId, data);
        });

        this.setState(state);
    }

    onJoin(client: Client, options) {
        const entity = this.world.createEntity(client.sessionId);
        entity.addComponent(Network, {
            sessionId: client.sessionId,
            networkId: entity.id,
        });

        // Adding more components
        entity
            .addComponent(Velocity, getRandomVelocity())
            .addComponent(Shape, getRandomShape())
            .addComponent(Position, getRandomPosition());
        console.log(this.roomId, "Created :", entity.id);
        this.sessionIdToEntityMap[client.sessionId] = entity;
        // const velocity = entity.getComponent(Velocity);
        // console.log(
        //     "INITIAL VELOCITY =>",
        //     velocity.x,
        //     velocity.y,
        //     velocity.toJSON()
        // );
        // const shape = entity.getComponent(Shape);
        // console.log("INITIAL SHAPE =>", shape.primitive, shape.toJSON());
        // const position = entity.getComponent(Position);
        // console.log(
        //     "INITIAL POSITION =>",
        //     position.x,
        //     position.y,
        //     position.toJSON()
        // );
    }

    update(deltaTime: number) {
        this.world.execute(deltaTime);
    }

    onLeave(client) {
        console.log(this.roomId, "OnLeave:", client.sessionId);
        const entity = this.sessionIdToEntityMap[client.sessionId];
        // const index = this.state.entities.indexOf(entity);
        // this.state.entities.splice(index, 1);
        console.log("Will call remove on entity #", entity.id);
        entity.remove();
        delete this.sessionIdToEntityMap[client.sessionId];
    }
}

// Some helper functions when creating the components
function getRandomVelocity() {
    return {
        x: SPEED_MULTIPLIER * (2 * Math.random() - 1),
        y: SPEED_MULTIPLIER * (2 * Math.random() - 1),
    };
}

function getRandomPosition() {
    return {
        x: Math.random() * canvasWidth,
        y: Math.random() * canvasHeight,
    };
}

function getRandomShape() {
    return {
        primitive: Math.random() >= 0.5 ? "circle" : "box",
        radius: 20,
        color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    };
}
