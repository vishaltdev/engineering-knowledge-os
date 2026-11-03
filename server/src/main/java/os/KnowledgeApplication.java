package os;

import java.io.IOException;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@SpringBootApplication
@RestController
public class KnowledgeApplication {
    private final ObjectMapper mapper;

    public KnowledgeApplication(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    public static void main(String[] args) {
        SpringApplication.run(KnowledgeApplication.class, args);
    }

    @GetMapping(value = "/api/concepts", produces = "application/json")
    Resource catalog() {
        return new ClassPathResource("concepts.json");
    }

    @GetMapping(value = "/api/concepts/idempotency", produces = "application/json")
    JsonNode idempotency() throws IOException {
        try (var input = catalog().getInputStream()) {
            for (JsonNode concept : mapper.readTree(input)) {
                if ("idempotency".equals(concept.path("id").asText())) {
                    return concept;
                }
            }
        }
        throw new IllegalStateException("Idempotency concept is missing from the catalog");
    }
}
