# Engineering Knowledge OS

A single-user system design study library covering Idempotency, Caching, Rate limiting, Load balancing, Message queues and Data partitioning. Each topic includes problem-first microlearning, three recall cards and three interactive architecture traces. Use the concept picker to move between topics while staying in Learn, Review or Atlas. The catalog is stored in server/src/main/resources/concepts.json and served at /api/concepts. See [DESIGN.md](DESIGN.md) for the schema, Staff-level worked example, UX, import plan and scope.

## Run locally

Use Java 21, Maven and Node 22.12 or later with npm. From this directory:

```sh
npm --prefix web ci
npm --prefix web run build
mkdir -p server/target/classes/static
cp -R web/dist/. server/target/classes/static/
mvn -f server/pom.xml package
java -jar server/target/engineering-knowledge-os-0.1.0.jar
```

Open http://localhost:8080. For mobile installation, serve the same build over HTTPS. The browser stores card schedules for this origin. After the first successful visit and service-worker activation, the app shell and concept are available from the offline cache. For a fresh rebuild, clean the Maven target before copying the frontend.
