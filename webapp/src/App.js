import * as React from "react";
import { Routes, Route } from "react-router-dom";
import Frames from "./routes/Frames/frames";
import Librarys from "./routes/Librarys/librarys";
import Home from "./routes/home";
import NotFound from "./routes/notFound";
import Header from "./components/header";
import NewFrame from "./routes/Frames/newFrame";
import NewLibrary from "./routes/Librarys/newLibrary";
import Library from "./routes/Librarys/library";
import NewImage from "./routes/Librarys/newImage";
import ArduinoLog from "./routes/ArduinoLog/arduinoLog";

export function App() {
    return (
        <>
            <Header />
            <Routes>
                <Route path="/" element={<Home />} />

                <Route path="frames" element={ <Frames /> } />
                <Route path="frames/:idFrame" element={ <Frames /> } />
                <Route path="new_frame/" element={ <NewFrame /> } />

                <Route path="librarys" element={ <Librarys /> } />
                <Route path="new_library" element={<NewLibrary />} />
                <Route path="library/:idLibrary" element={<Library />} />
                <Route path="library/:idLibrary/:idPicture" element={<Library />} />
                <Route path="new_image/:idLibrary/:order" element={<NewImage />} />

                <Route path="arduinologs" element={<ArduinoLog />} />

                <Route path="*" element={<NotFound />} />
            </Routes>
        </>
    );
}