-- CreateIndex
CREATE INDEX "fahrzeugtypen_istAktiv_sortOrder_idx" ON "fahrzeugtypen"("istAktiv", "sortOrder");

-- CreateIndex
CREATE INDEX "funk_status_config_istAlarmierbar_idx" ON "funk_status_config"("istAlarmierbar");

-- CreateIndex
CREATE INDEX "qualifikationen_istAktiv_sortOrder_idx" ON "qualifikationen"("istAktiv", "sortOrder");

-- CreateIndex
CREATE INDEX "rollen_definitionen_istAktiv_sortOrder_idx" ON "rollen_definitionen"("istAktiv", "sortOrder");
