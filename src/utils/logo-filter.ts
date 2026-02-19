import axios from 'axios';

const CLIP_SERVICE_URL = process.env.CLIP_SERVICE_URL || 'http://localhost:51000';

export class LogoFilter {
  /**
   * Discards images that are primarily logos or text graphics.
   */
  static async isLogo(imageUri: string): Promise<boolean> {
    const payload = {
      data: [{
        uri: imageUri,
        matches: [
          { text: "a business logo, watermark, or text graphic" },
          { text: "a photograph of a place or building" },
        ]
      }],
      execEndpoint: '/rank'
    };

    try {
      const response = await axios.post(`${CLIP_SERVICE_URL}/post`, payload);
      const matches = response.data.data[0].matches;

      // Find which label has the higher score
      const logoMatch = matches.find((m: any) => m.text.includes("logo"));
      const photoMatch = matches.find((m: any) => m.text.includes("photograph"));

      if (!logoMatch || !photoMatch) {
        console.warn("Logo detection: unexpected match labels in CLIP response");
        return false;
      }

      const logoScore = logoMatch.scores.clip_score.value;
      const photoScore = photoMatch.scores.clip_score.value;

      // Strict threshold for logo detection to avoid false positives on architecture
      return logoScore > 0.85 && logoScore > photoScore;
    } catch (error) {
      console.error("Logo Detection Failed:", error);
      // In case of error, we keep the image to avoid over-filtering
      return false;
    }
  }
}
