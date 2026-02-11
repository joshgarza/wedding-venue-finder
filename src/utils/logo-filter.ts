import axios from 'axios';

export class LogoFilter {
  // Matches the service name in your docker-compose.yml
  private static readonly CLIP_URL = 'http://clip_service:51000/rank';

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
      }]
    };

    try {
      const response = await axios.post(this.CLIP_URL, payload);
      const matches = response.data.result[0].matches;

      // Find which label has the higher score
      const logoScore = matches.find((m: any) => m.text.includes("logo")).scores.clip_score;
      const photoScore = matches.find((m: any) => m.text.includes("photograph")).scores.clip_score;

      // Strict threshold for logo detection to avoid false positives on architecture
      return logoScore > 0.85 && logoScore > photoScore;
    } catch (error) {
      console.error("Logo Detection Failed:", error);
      // In case of error, we keep the image to avoid over-filtering
      return false; 
    }
  }
}
