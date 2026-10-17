package com.ketoan.resource;

import com.ketoan.entity.ClosingEntry;
import jakarta.ws.rs.Path;
import java.util.List;
import java.util.Map;

@Path("/closing-entries")
public class ClosingEntryResource extends MasterResource<ClosingEntry> {
    protected Class<ClosingEntry> type() { return ClosingEntry.class; }
    protected List<String> searchFields() {
        return List.of("code", "name", "fromAccount", "toAccount", "description");
    }
    protected String codePrefix() { return "KC"; }
    @Override protected Map<String, String> sortable() {
        return Map.of("code", "e.code", "name", "e.name", "fromAccount", "e.fromAccount",
                "toAccount", "e.toAccount", "description", "e.description");
    }
}
