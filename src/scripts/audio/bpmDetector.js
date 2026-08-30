import React from "react";
import { analyze } from "web-audio-beat-detector";
import {
	Upload,
	Button,
	Typography,
	Progress,
	message,
	List,
	Space
} from "antd";
import { UploadOutlined, CloseOutlined } from "@ant-design/icons";
import "./styles.css";

const { Title } = Typography;

const getRandomDelay = () => {
	return Math.floor(Math.random() * 3000) + 2000; // Random delay between 2s and 4s
};

const audioFileTypes = [".mp3", ".wav", ".aac", ".ogg", ".flac"]; // Allowed audio file types

export default function src() {
  const [songs, setSongs] = React.useState([]);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);

  const roundBPM = (value) => {
    return Math.round(value * 10) / 10;
  };

  const analyse = async (song) => {
    const { file, delay } = song;

    const audioContext = new AudioContext();
    const reader = new FileReader();

    reader.onloadstart = () => {
      setUploading(true);
      setProgress(0);
    };

    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setProgress(percent);
      }
    };

    reader.onload = async () => {
      await new Promise((resolve) => setTimeout(resolve, delay)); // Delay before analysis

      const audioBuffer = await audioContext.decodeAudioData(reader.result);

      const tempo = await analyze(audioBuffer);
      const bpm = roundBPM(tempo);

      setUploading(false);
      setProgress(0);

      setSongs((prevSongs) => {
        const updatedSongs = prevSongs.map((s) => {
          if (s.file === file) {
            return { ...s, bpm };
          }
          return s;
        });
        return updatedSongs;
      });

      message.success(`${file.name} analyzed successfully!`);
    };

    if (file instanceof Blob) {
      reader.readAsArrayBuffer(file);
    } else {
      console.error("Invalid file");
    }
  };

  const handleFileUpload = (file) => {
    const extension = file.name
      .substring(file.name.lastIndexOf("."))
      .toLowerCase();
    if (!audioFileTypes.includes(extension)) {
      message.error(
        "Invalid file format. Please upload an audio file (MP3, WAV, etc.)."
      );
      return;
    }

    const song = {
      file,
      delay: getRandomDelay(),
      bpm: null
    };

    setSongs((prevSongs) => [...prevSongs, song]);
    analyse(song);
  };

  const handleRemoveSong = (file) => {
    setSongs((prevSongs) => prevSongs.filter((s) => s.file !== file));
  };

  return (
    <div className="app">
      <header className="header">
        <Title level={2} style={{ color: "#ffffff" }}>
          BPM Detector
        </Title>
      </header>
      <div className="content">
        <Upload
          beforeUpload={() => false}
          onChange={(info) => handleFileUpload(info.file)}
          showUploadList={false}
          accept={audioFileTypes.join(",")}
          multiple
        >
          <Button icon={<UploadOutlined />} disabled={uploading}>
            Select Audio Files
          </Button>
        </Upload>
        {uploading && (
          <div className="progress-container">
            <Progress percent={progress} status="active" />
          </div>
        )}
        <List
          itemLayout="horizontal"
          dataSource={songs}
          renderItem={(song) => (
            <List.Item>
              <List.Item.Meta
                title={song.file.name}
                description={song.bpm ? `BPM: ${song.bpm}` : "Analyzing..."}
              />
              <div className="remove-button">
                {!uploading && (
                  <Button
                    shape="circle"
                    icon={<CloseOutlined />}
                    onClick={() => handleRemoveSong(song.file)}
                  />
                )}
              </div>
            </List.Item>
          )}
        />
      </div>
      <footer className="footer">
        <p>&copy; 2023 BPM Detector. All rights reserved.</p>
      </footer>
    </div>
  );
}
