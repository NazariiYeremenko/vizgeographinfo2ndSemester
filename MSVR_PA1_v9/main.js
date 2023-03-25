'use strict';

let gl;                         // The webgl context.
let surface;                    // A surface model
let shProgram;                  // A shader program
let spaceball;                  // A SimpleRotator object that lets the user rotate the view by mouse.

let point;
let texturePoint;
let scale;

function deg2rad(angle) {
    return angle * Math.PI / 180;
}


// Constructor
function Model(name) {
    this.name = name;
    this.iVertexBuffer = gl.createBuffer();
    this.iTextureBuffer = gl.createBuffer();
    this.count = 0;
    this.countText = 0;

    this.BufferData = function (vertices) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STREAM_DRAW);

        this.count = vertices.length / 3;
    }

    this.TextureBufferData = function (normals) {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STREAM_DRAW);

        this.countText = normals.length / 2;
    }

    this.Draw = function () {

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iVertexBuffer);
        gl.vertexAttribPointer(shProgram.iAttribVertex, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribVertex);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.iTextureBuffer);
        gl.vertexAttribPointer(shProgram.iAttribTexture, 2, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(shProgram.iAttribTexture);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, this.count);
    }
}

// Constructor
function ShaderProgram(name, program) {

    this.name = name;
    this.prog = program;

    // Location of the attribute variable in the shader program.
    this.iAttribVertex = -1;
    this.iAttribTexture = -1;
    // Location of the uniform matrix representing the combined transformation.
    this.iModelViewProjectionMatrix = -1;

    this.iTranslatePoint = -1;
    this.iTexturePoint = -1;
    this.iscale = -1;
    this.iTMU = -1;

    this.Use = function () {
        gl.useProgram(this.prog);
    }
}


/* Draws a colored cube, along with a set of coordinate axes.
 * (Note that the use of the above drawPrimitive function is not an efficient
 * way to draw with WebGL.  Here, the geometry is so simple that it doesn't matter.)
 */
function draw() {
    let D = document;
    let spans = D.getElementsByClassName("slider-value");

    gl.clearColor(0, 0, 0, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    let conv, // convergence
        eyes, // eye separation
        ratio, // aspect ratio
        fov; // field of view
    conv = 2000.0;
    conv = D.getElementById("conv").value;
    spans[3].innerHTML=conv;
    eyes = 70.0;
    eyes = D.getElementById("eyes").value;
    spans[0].innerHTML=eyes;
    ratio = 1.0;
    fov = Math.PI / 4;
    fov = D.getElementById("fov").value;
    spans[1].innerHTML=fov;
    let top, bottom, left, right, near, far;
    near = 10.0;
    near = D.getElementById("near").value-0.0;
    spans[2].innerHTML=near;
    far = 20000.0;

    top = near * Math.tan(fov / 2.0);
    bottom = -top;

    let a = ratio * Math.tan(fov / 2.0) * conv;

    let b = a - eyes / 2;
    let c = a + eyes / 2;

    left = -b * near / conv;
    right = c * near / conv;

    // console.log(left, right, bottom, top, near, far);

    let projectionLeft = m4.orthographic(left, right, bottom, top, near, far);

    left = -c * near / conv;
    right = b * near / conv;

    let projectionRight = m4.orthographic(left, right, bottom, top, near, far);

    /* Get the view matrix from the SimpleRotator object.*/
    let modelView = spaceball.getViewMatrix();

    let rotateToPointZero = m4.axisRotation([0.707, 0.707, 0], 0.7);
    let translateToPointZero = m4.translation(0, 0, -10);
    let translateToLeft = m4.translation(-0.03, 0, -20);
    let translateToRight = m4.translation(0.03, 0, -20);

    let matAccum0 = m4.multiply(rotateToPointZero, modelView);
    let matAccumLeft = m4.multiply(translateToLeft, matAccum0);
    let matAccumRight = m4.multiply(translateToRight, matAccum0);

    gl.uniform1i(shProgram.iTMU, 0);
    gl.enable(gl.TEXTURE_2D);
    gl.uniform2fv(shProgram.iTexturePoint, [texturePoint.x, texturePoint.y]);
    gl.uniform1f(shProgram.iscale, scale);
    
    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumLeft);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionLeft);
    gl.colorMask(true, false, false, false);
    surface.Draw();

    gl.clear(gl.DEPTH_BUFFER_BIT);

    gl.uniformMatrix4fv(shProgram.iModelViewMatrix, false, matAccumRight);
    gl.uniformMatrix4fv(shProgram.iProjectionMatrix, false, projectionRight);
    gl.colorMask(false, true, true, false);
    surface.Draw();

    gl.colorMask(true, true, true, true);
}

function CreateSurfaceData() {
    let vertexList = [];
    let numSteps = 100
    let uMax = Math.PI * 2
    let vMax = Math.PI
    let step = Math.PI*2 / numSteps;

    for (let u = 0; u <= uMax; u += step) {
        for (let v = -vMax; v <= vMax; v += step) {
            let vert = nails(u, v)
            let avert = nails(u + step, v)
            let bvert = nails(u, v + step)
            let cvert = nails(u + step, v + step)

            vertexList.push(vert.x, vert.y, vert.z)
            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)

            vertexList.push(avert.x, avert.y, avert.z)
            vertexList.push(cvert.x, cvert.y, cvert.z)
            vertexList.push(bvert.x, bvert.y, bvert.z)
        }
    }

    return vertexList;
}

function CreateTexture() {
    let texture = [];
    let numSteps = 100
    let uMax = Math.PI * 2
    let vMax = Math.PI
    let step = Math.PI*2 / numSteps;

    for (let u = 0; u <= uMax; u += step) {
        for (let v = -vMax; v <= vMax; v += step) {
            let u1 = map(u, 0, uMax, 0, 1)
            let v1 = map(v, -vMax, vMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u + step, 0, uMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u, 0, uMax, 0, 1)
            v1 = map(v + step, -vMax, vMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u + step, 0, uMax, 0, 1)
            v1 = map(v, -vMax, vMax, 0, 1)
            texture.push(u1, v1)
            v1 = map(v + step, -vMax, vMax, 0, 1)
            texture.push(u1, v1)
            u1 = map(u, 0, uMax, 0, 1)
            v1 = map(v + step, -vMax, vMax, 0, 1)
            texture.push(u1, v1)
        }
    }

    return texture;
}

function map(val, f1, t1, f2, t2) {
    let m;
    m = (val - f1) * (t2 - f2) / (t1 - f1) + f2
    return Math.min(Math.max(m, f2), t2);
}

function nails(u, v) {
    let x = 0.3 * u * Math.sin(u) * Math.cos(v)
    let y = 0.3 * u * Math.cos(u) * Math.cos(v)
    let z = -0.3 * u * Math.sin(v)
    return { x: x, y: y, z: z }
}


/* Initialize the WebGL context. Called from init() */
function initGL() {
    let prog = createProgram(gl, vertexShaderSource, fragmentShaderSource);

    shProgram = new ShaderProgram('Basic', prog);
    shProgram.Use();

    shProgram.iAttribVertex = gl.getAttribLocation(prog, "vertex");
    shProgram.iAttribTexture = gl.getAttribLocation(prog, "texture");
    shProgram.iModelViewMatrix = gl.getUniformLocation(prog, "ModelViewMatrix");
    shProgram.iProjectionMatrix = gl.getUniformLocation(prog, "ProjectionMatrix");
    shProgram.iTranslatePoint = gl.getUniformLocation(prog, 'translatePoint');
    shProgram.iTexturePoint = gl.getUniformLocation(prog, 'texturePoint');
    shProgram.iscale = gl.getUniformLocation(prog, 'scale');
    shProgram.iTMU = gl.getUniformLocation(prog, 'tmu');

    surface = new Model('Surface');
    surface.BufferData(CreateSurfaceData());
    LoadTexture()
    surface.TextureBufferData(CreateTexture());
    point = new Model('Point');
    point.BufferData(CreateSphereSurface())

    gl.enable(gl.DEPTH_TEST);
}


/* Creates a program for use in the WebGL context gl, and returns the
 * identifier for that program.  If an error occurs while compiling or
 * linking the program, an exception of type Error is thrown.  The error
 * string contains the compilation or linking error.  If no error occurs,
 * the program identifier is the return value of the function.
 * The second and third parameters are strings that contain the
 * source code for the vertex shader and for the fragment shader.
 */
function createProgram(gl, vShader, fShader) {
    let vsh = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vsh, vShader);
    gl.compileShader(vsh);
    if (!gl.getShaderParameter(vsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in vertex shader:  " + gl.getShaderInfoLog(vsh));
    }
    let fsh = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fsh, fShader);
    gl.compileShader(fsh);
    if (!gl.getShaderParameter(fsh, gl.COMPILE_STATUS)) {
        throw new Error("Error in fragment shader:  " + gl.getShaderInfoLog(fsh));
    }
    let prog = gl.createProgram();
    gl.attachShader(prog, vsh);
    gl.attachShader(prog, fsh);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        throw new Error("Link error in program:  " + gl.getProgramInfoLog(prog));
    }
    return prog;
}


/**
 * initialization function that will be called when the page has loaded
 */
function init() {
    texturePoint = { x: 0.9, y: 0.5 }
    scale = 0.0;
    let canvas;
    try {
        canvas = document.getElementById("webglcanvas");
        gl = canvas.getContext("webgl");
        if (!gl) {
            throw "Browser does not support WebGL";
        }
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not get a WebGL graphics context.</p>";
        return;
    }
    try {
        initGL();  // initialize the WebGL graphics context
    }
    catch (e) {
        document.getElementById("canvas-holder").innerHTML =
            "<p>Sorry, could not initialize the WebGL graphics context: " + e + "</p>";
        return;
    }

    spaceball = new TrackballRotator(canvas, draw, 0);

    draw()
}

function CreateSphereSurface(r = 0.08) {
    let vertexList = [];
    let lon = -Math.PI;
    let lat = -Math.PI * 0.5;
    while (lon < Math.PI) {
        while (lat < Math.PI * 0.5) {
            let v1 = sphereSurfaceDate(r, lon, lat);
            vertexList.push(v1.x, v1.y, v1.z);
            lat += 0.05;
        }
        lat = -Math.PI * 0.5
        lon += 0.05;
    }
    return vertexList;
}

function sphereSurfaceDate(r, u, v) {
    let x = r * Math.sin(u) * Math.cos(v);
    let y = r * Math.sin(u) * Math.sin(v);
    let z = r * Math.cos(u);
    return { x: x, y: y, z: z };
}

function LoadTexture() {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const image = new Image();
    image.crossOrigin = 'anonymus';

    image.src = "https://raw.githubusercontent.com/NazariiYeremenko/vizgeographinfo/CGW/0051-512x512.jpeg";
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            gl.RGBA,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            image
        );
        draw()
    }
}

onmousemove = (e) => {
    scale = map(e.clientX, 0, window.outerWidth, 0, Math.PI)
    draw()
};