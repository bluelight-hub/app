import { Route, Routes } from "react-router";
import AnforderungenPage from "../components/pages/anforderungen/page";
import AufnehmenPage from "../components/pages/betroffene/aufnehmen/page";
import ManvPage from "../components/pages/betroffene/manv/page";
import BetroffenePage from "../components/pages/betroffene/page";
import VerwaltenPage from "../components/pages/betroffene/verwalten/page";
import ChecklistenPage from "../components/pages/checklisten/page";
import AppIndexPage from "../components/pages/dashboard/page";
import EinsatzabschnittePage from "../components/pages/einsatzabschnitte/page";
import EinsatzdatenPage from "../components/pages/einsatzdaten/page";
import EinsatzkräftePage from "../components/pages/einsatzkräfte/page";
import EinsatztagebuchPage from "../components/pages/einsatztagebuch/page";
import FahrzeugePage from "../components/pages/fahrzeuge/page";
import FmsPage from "../components/pages/fms/page";
import GefahrenPage from "../components/pages/gefahren/page";
import IndexPage from "../components/pages/IndexPage";
import KanallistePage from "../components/pages/kanalliste/page";
import KommunikationsverzeichnisPage from "../components/pages/kommunikationsverzeichnis/page";
import KräftePage from "../components/pages/kräfte/page";
import DwdWetterkartePage from "../components/pages/lagekarte/dwd-wetterkarte/page";
import LetzteEintraegePage from "../components/pages/lagekarte/letzte-eintraege/page";
import LagekartePage from "../components/pages/lagekarte/page";
import NotizenPage from "../components/pages/notizen/page";
import RemindersPage from "../components/pages/reminders/page";
import RollenPage from "../components/pages/rollen/page";
import SchadenPage from "../components/pages/schaden/page";
import BerichtPage from "../components/pages/uav/bericht/page";
import FlugaufträgePage from "../components/pages/uav/flugaufträge/page";
import FlugzonenPage from "../components/pages/uav/flugzonen/page";
import UavPage from "../components/pages/uav/page";
import ProtokollPage from "../components/pages/uav/protokoll/page";
import RoutenPage from "../components/pages/uav/routen/page";
import StreamPage from "../components/pages/uav/stream/page";
import TelemetriePage from "../components/pages/uav/telemetrie/page";
import WetterPage from "../components/pages/uav/wetter/page";
import AppLayout from "../components/templates/AppLayout";

// Router Configuration
export const Router = () => {
    return (
        <Routes>
            <Route path="/" element={<IndexPage />} />
            <Route path="/app" element={<AppLayout />}>
                <Route index element={<AppIndexPage />} />

                {/* Einsatz */}
                <Route path="einsatztagebuch" element={<EinsatztagebuchPage />} />
                <Route path="checklisten" element={<ChecklistenPage />} />
                <Route path="reminders" element={<RemindersPage />} />
                <Route path="kräfte" element={<KräftePage />} />
                <Route path="fahrzeuge" element={<FahrzeugePage />} />
                <Route path="einsatzkräfte" element={<EinsatzkräftePage />} />
                <Route path="rollen" element={<RollenPage />} />

                {/* Betroffene */}
                <Route path="betroffene">
                    <Route index element={<BetroffenePage />} />
                    <Route path="aufnehmen" element={<AufnehmenPage />} />
                    <Route path="verwalten" element={<VerwaltenPage />} />
                    <Route path="manv" element={<ManvPage />} />
                </Route>

                {/* Anforderungen */}
                <Route path="anforderungen" element={<AnforderungenPage />} />

                {/* Lagekarte */}
                <Route path="lagekarte">
                    <Route index element={<LagekartePage />} />
                    <Route path="letzte-eintraege" element={<LetzteEintraegePage />} />
                    <Route path="dwd-wetterkarte" element={<DwdWetterkartePage />} />
                </Route>

                {/* UAV */}
                <Route path="uav">
                    <Route index element={<UavPage />} />
                    <Route path="flugaufträge" element={<FlugaufträgePage />} />
                    <Route path="flugzonen" element={<FlugzonenPage />} />
                    <Route path="routen" element={<RoutenPage />} />
                    <Route path="wetter" element={<WetterPage />} />
                    <Route path="stream" element={<StreamPage />} />
                    <Route path="telemetrie" element={<TelemetriePage />} />
                    <Route path="protokoll" element={<ProtokollPage />} />
                    <Route path="bericht" element={<BerichtPage />} />
                </Route>

                {/* Kommunikation & Funk */}
                <Route path="kanalliste" element={<KanallistePage />} />
                <Route path="kommunikationsverzeichnis" element={<KommunikationsverzeichnisPage />} />
                <Route path="fms" element={<FmsPage />} />

                {/* Einsatzinformationen */}
                <Route path="einsatzdaten" element={<EinsatzdatenPage />} />
                <Route path="einsatzabschnitte" element={<EinsatzabschnittePage />} />
                <Route path="schaden" element={<SchadenPage />} />
                <Route path="gefahren" element={<GefahrenPage />} />
                <Route path="notizen" element={<NotizenPage />} />
            </Route>
        </Routes>

    );
}; 