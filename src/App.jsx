import React, { useState, useRef, useEffect } from 'react';
import chroma from 'chroma-js';
import { Tabs } from "@headlessui/react";
import ColorThief from 'colorthief';

export default function ColorPaletteGenerator() {
  const [image, setImage] = useState(null);
  const [baseColors, setBaseColors] = useState([]);
  const [palette, setPalette] = useState([]);
  const [contrastPairs, setContrastPairs] = useState([]);
  const [suggestedColors, setSuggestedColors] = useState([]);
  const [suggestedNeutrals, setSuggestedNeutrals] = useState([]);
  const imageRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onloadend = () => {
      setImage(reader.result);
    };
    if (file) reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (imageRef.current && image) {
      imageRef.current.onload = () => {
        const colorThief = new ColorThief();
        const img = imageRef.current;
        const colors = colorThief.getPalette(img, 5);
        const hexColors = colors.map(rgb => chroma(rgb).hex());
        setBaseColors(hexColors);
        generateSmartPalette(hexColors);
        generateSuggestedAddOns(hexColors);
        generateSuggestedNeutrals(hexColors);
      };
    }
  }, [image]);

  const generateSmartPalette = (colors) => {
    const extended = colors.flatMap((color) => [
      chroma(color).brighten(1).hex(),
      chroma(color).hex(),
      chroma(color).darken(1).hex(),
      chroma(color).set('hsl.h', "+30").hex(),
      chroma(color).set('hsl.h', "-30").hex()
    ]);

    const uniqueColors = [...new Set(extended)];
    const namedPalette = uniqueColors.map(hex => ({
      hex,
      name: nameColor(hex),
      contrastWithWhite: chroma.contrast(hex, 'white').toFixed(2),
      contrastWithBlack: chroma.contrast(hex, 'black').toFixed(2)
    }));
    setPalette(namedPalette);
    generateContrastPairs(namedPalette);
  };

  const generateSuggestedAddOns = (colors) => {
    const addOns = colors.flatMap(hex => {
      const base = chroma(hex);
      const suggestions = [
        base.set('hsl.h', '+180'),
        base.set('hsl.h', '+60'),
        base.set('hsl.h', '-60')
      ];

      return suggestions.map(s => {
        const contrastWhite = chroma.contrast(s, 'white');
        const contrastBlack = chroma.contrast(s, 'black');
        const adjusted = contrastWhite < 4.5 && contrastBlack < 4.5 ? s.darken(2) : s;

        return {
          base: hex,
          suggested: adjusted.hex(),
          name: nameColor(adjusted.hex()),
          contrastWithWhite: contrastWhite.toFixed(2),
          contrastWithBlack: contrastBlack.toFixed(2)
        };
      });
    });

    setSuggestedColors(addOns);
  };

  const generateSuggestedNeutrals = (colors) => {
    const lightNeutral = chroma.average(colors, 'lab').brighten(3).desaturate(2).hex();
    const darkNeutral = chroma.average(colors, 'lab').darken(3).desaturate(2).hex();

    setSuggestedNeutrals([
      {
        hex: lightNeutral,
        label: 'Suggested Light Neutral',
        name: nameColor(lightNeutral),
        contrast: baseColors.map(c => ({ color: c, ratio: chroma.contrast(lightNeutral, c).toFixed(2) }))
      },
      {
        hex: darkNeutral,
        label: 'Suggested Dark Neutral',
        name: nameColor(darkNeutral),
        contrast: baseColors.map(c => ({ color: c, ratio: chroma.contrast(darkNeutral, c).toFixed(2) }))
      }
    ]);
  };

  const generateContrastPairs = (colors) => {
    const pairs = [];
    for (let i = 0; i < colors.length; i++) {
      for (let j = 0; j < colors.length; j++) {
        if (i !== j) {
          const contrast = chroma.contrast(colors[i].hex, colors[j].hex);
          pairs.push({
            text: colors[i],
            background: colors[j],
            contrast: contrast.toFixed(2),
            accessible: contrast >= 4.5 ? '✅ AA' : contrast >= 3 ? '⚠️ AA Large' : '❌'
          });
        }
      }
    }
    setContrastPairs(pairs);
  };

  const nameColor = (hex) => {
    const hue = chroma(hex).get('hsl.h');
    const lightness = chroma(hex).get('lab.l');
    if (lightness > 80) return 'Very Light ' + getHueName(hue);
    if (lightness < 30) return 'Dark ' + getHueName(hue);
    return getHueName(hue);
  };

  const getHueName = (hue) => {
    if (hue < 30 || hue >= 330) return 'Red';
    if (hue < 60) return 'Orange';
    if (hue < 90) return 'Yellow';
    if (hue < 150) return 'Green';
    if (hue < 210) return 'Cyan';
    if (hue < 270) return 'Blue';
    if (hue < 330) return 'Purple';
    return 'Color';
  };

  return <div className="p-6">Your app UI goes here</div>;
}
