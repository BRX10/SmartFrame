import * as React from "react";
import { Routes, Route } from "react-router-dom";
import Frames from "./routes/Frames/frames";
import Librarys from "./routes/Librarys/librarys";
import Home from "./routes/home";
import NotFound from "./routes/notFound";
import Layout from "./components/layout";
import NewFrame from "./routes/Frames/newFrame";
import NewLibrary from "./routes/Librarys/newLibrary";
import Library from "./routes/Librarys/library";
import NewImage from "./routes/Librarys/newImage";
import ArduinoLog from "./routes/ArduinoLog/arduinoLog";
import EnrichmentSettings from "./routes/Settings/enrichment";
import Signin from "./routes/Authentication/signin";
import Signout from "./routes/Authentication/signout";
import useToken from "./services/useToken";

export function App() {
    
    const { token, setToken, delToken } = useToken();

    if(!token) {
        return <Signin setToken={setToken} delToken={delToken} />
    }
    
    return (
        <>
            <Routes>
                <Route path="*" element={<NotFound />} />
                <Route path="signout" element={<Signout token={token} delToken={delToken} />} />
                
                <Route element={<Layout />}>
                    <Route path="/" element={<Home token={token} />} />

                    <Route path="frames" element={ <Frames token={token} /> } />
                    <Route path="frames/:idFrame" element={ <Frames token={token} /> } />
                    <Route path="new_frame/" element={ <NewFrame token={token} /> } />

                    <Route path="librarys" element={ <Librarys token={token} /> } />
                    <Route path="new_library" element={<NewLibrary token={token} />} />
                    <Route path="library/:idLibrary" element={<Library token={token} />} />
                    <Route path="library/:idLibrary/:idPicture" element={<Library token={token} />} />
                    <Route path="new_image/:idLibrary/:order" element={<NewImage token={token} />} />

                    <Route path="arduinologs" element={<ArduinoLog token={token} />} />
                    <Route path="settings" element={<EnrichmentSettings token={token} />} />
                </Route>
            </Routes>
        </>
    );
}