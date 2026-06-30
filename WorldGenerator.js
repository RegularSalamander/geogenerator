class WorldGenerator {
    constructor(w) {
        this.cols = Math.floor(w/2)*2;
        this.rows = this.cols/2;

        this.cells = [];
        for(let i = 0; i < this.cols; i++) {
            this.cells[i] = [];
            for (let j = 0; j < this.rows; j++) {
                this.cells[i][j] = {
                    x: i,
                    y: j
                };
            }
        }

        this.noiseGen = new NoiseGenerator(10, 2, 1.5);

        this.vis = createGraphics(this.cols, this.rows);
        this.vis.background(0);
    }

    draw() {
        image(this.vis, 0, 0);
    }

    getCell(x, y) {
        //handle spherical shaped world
        while(x < 0) x += this.cols;
        while(x > this.cols) x -= this.cols;
        while(y < 0) y += this.rows;
        while(y > this.rows) y -= this.rows;

        return this.cells[x][y];
    }

    *actOnCell(func, drawFunc) {
        for(let i in this.cells) {
            for(let j in this.cells[i]) {
                func(this, this.cells[i][j]);
                if(drawFunc) drawFunc(this, this.cells[i][j]);
                yield;
            }
        }
    }

    sphereNoise(world, cell) {
        //arbitrary bias to the location noise is sampled from
        //prevents repeating patturns
        const bias = 10;
        const scl = 0.5;

        //sample noise from a 3D space, on the surface of a sphere
        const theta = (cell.x / world.cols) * 2*Math.PI;
        const phi = (cell.y / world.rows) * Math.PI;
        const rho = scl;
        
        const x = rho * Math.sin(phi) * Math.cos(theta) + bias;
        const y = rho * Math.sin(phi) * Math.sin(theta) + bias;
        const z = rho * Math.cos(phi) + bias;

        cell.noise = world.noiseGen.getNoise(x, y, z);
    }

    testDrawCell(world, cell) {
        if(!cell.noise) return;

        const waterLine = 0.5;

        world.vis.noFill();
        if(cell.noise > waterLine) {
            const col1 = [50, 200, 50];
            const col2 = [128, 128, 128];
            const col3 = [255, 255, 255];
            const divider = 0.6;
            if(cell.noise < divider) {
                world.vis.stroke(
                    map(cell.noise, waterLine, divider, col1[0], col2[0]),
                    map(cell.noise, waterLine, divider, col1[1], col2[1]),
                    map(cell.noise, waterLine, divider, col1[2], col2[2])
                );
            } else {
                world.vis.stroke(
                    map(cell.noise, divider, 1, col2[0], col3[0]),
                    map(cell.noise, divider, 1, col2[1], col3[1]),
                    map(cell.noise, divider, 1, col2[2], col3[2])
                );
            }
        } else {
            world.vis.stroke(0, 0, 180);
        }

        world.vis.point(
            map(cell.x, 0, world.cols, 0, width),
            map(cell.y, 0, world.rows, 0, height),
        )
    }
}