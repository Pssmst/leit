import * as global from './global.js';

export class Album {
    /**
     * @param {String} name - Name of album
     * @param {String} cover - Path of cover file; a DISK cover can overwrite an ALBUM cover
     * @param {2D Array} discs - Elements of discs each contain arrays of songs
     */
    constructor(name, cover, discs) {
        this.name = name;

        if (cover === null) {
            this.cover = global.T.cover_unknown;
        } else {
            this.cover = cover;
        }

        this.discs = discs;
        this.id = null;
    }

    update() {
        // Iterate discs
        let i = 1;
        for (const disc of this.discs) {
            disc.album = this.name;
            disc.id = i;

            // Cover transfer
            if (disc.cover === null) {
                disc.cover = this.cover;
            }
            i++;
        }
    }
}

export class Disc {
    /**
     * @param {String} cover - Path of cover file; a SONG cover can overwrite a DISK cover
     * @param {Array} songs - Each song is an object, too
     */
    constructor(cover, songs) {
        this.cover = cover;
        this.songs = songs;
        this.album = null;
        this.id = null;
    }

    update(album) {
        this.album = album.name;

        // Iterate songs
        let i = 1;
        for (const song of this.songs) {
            song.album = this.album;
            song.discID = this.id;
            song.id[1] = i;

            // Cover transfer
            if (song.cover === null) {
                song.cover = this.cover;
            }
            i++;
        }
    }
}

export class Song {
    constructor(name, // Name that is used to retrieve song
        {
            album = null,
            discID = null,
            cover = null,
            daw = null,
            date = ``,
            shortDescription = ``,
            longDescription = `[No description]`,
            x = 0,
            y = 0,
            id = [null, null], 
            preferredName = null, // Overwrites `name` ONLY in UI (not in song retrieval)
            alternativeNames = [],
            structure = [],
            motifs = [],
        } = {}
    ) {
        this.name = name;
        this.album = album;
        this.discID = discID,
        this.cover = cover;
        this.daw = daw;
        this.date = date;
        this.shortDescription = shortDescription;
        this.longDescription = longDescription;
        this.x = x;
        this.y = y;
        this.id = id; // [AlbumID, DiscID] (ID = place in line)
        this.preferredName = preferredName;
        this.alternativeNames = alternativeNames;
        this.structure = structure;
        this.motifs = motifs;

        this.duration = null;
        this.songPath = null;
    }

    update() {
        this.songPath = `../App/assets/Music/${this.album}/${this.name}.wav`;
        if (this.preferredName === null) {
            this.preferredName = this.name;
        }
    }
}

export class Motif {
    constructor(name,
        {
            occurrences = {},
            origin = null,
            color = `#ffffff`,
        } = {}
    ) {
        this.name = name;
        this.occurrences = occurrences;
        this.origin = origin;
        this.color = color;
    }
}

// Update all from top down
export function updateEverything() {
    let albumID = 1;
    for (const album of albums) {
        // Update album covers
        if (typeof album.cover === 'string' && global.T[album.cover]) {
            album.cover = global.T[album.cover];
        }
        album.update();

        let songID = 1;
        for (const disc of album.discs) {
            // Update disc covers
            if (typeof disc.cover === 'string' && global.T[disc.cover]) {
                disc.cover = global.T[disc.cover];
            }
            disc.update(album);

            for (const song of disc.songs) {
                // Update song covers
                if (typeof song.cover === 'string' && global.T[song.cover]) {
                    song.cover = global.T[song.cover];
                }
                song.update();
                song.id[0] = songID;
                songID++;

                // Structure!

                let currentStruct;
                if (song.structure && song.structure.length > 0) {
                    for (let i = 0; i < song.structure.length; i++) {
                        currentStruct = song.structure[i][1];

                        if (!currentStruct.bpm) {
                            currentStruct.bpm = (i === 0 ? null : song.structure[i-1][1].bpm);
                        }
                        if (!currentStruct.timeSignature) {
                            currentStruct.timeSignature = (i === 0 ? [null,null] : song.structure[i-1][1].timeSignature);
                        }
                        if (!currentStruct.keySignature) {
                            currentStruct.keySignature = (i === 0 ? '' : song.structure[i-1][1].keySignature);
                        }
                    }
                }
                song.structure.sort((a,b) => a[0] - b[0]);
            }
        }
        album.numOfSongs = songID-1;
        album.id = albumID;
        albumID++;
    }
}

/////  ALBUMS  /////////////////////////////////////////////////////////////////////////

export const albums = [

    // STUFF & THINGS VOL. 1

    new Album(`Stuff & Things Vol. 1`, `cover_StuffNThings_1`,
    [
        // Disc 1: Chrome Music Lab
        new Disc(null,
        [
            new Song(`Song 1`, { 
                daw: `CML`, date: `8/29/2018`,
                shortDescription: `My first song`,
                longDescription: `This was the first thing I ever considered an actual musical expression, although I was just placing random notes in Chrome Music Lab.\nI remember coming into my parents' bedroom and showing them my song and them telling me I had a talent. I would go on to join the band in sixth grade.`,
                structure: [ [1, { bpm: 106, timeSignature: [4,4] }], ],
                motifs: [],
            }),

            new Song(`Song 2`, {
                daw: `CML`, date: `4/27/2019`,
                shortDescription: `First banger`,
                longDescription: `I was very proud of this one, but I did not understand why. Now that I am older, I know that it was because I accidentally discovered the magic of a musical "pickup," where the song starts before the first measure.`,
                structure: [[1, { bpm: 120, timeSignature: [4,4] }], ],
                motifs: [],
            }),
        ]),

        // Disc 2: MultiJumper OST
        new Disc(null,
        [
            new Song(`Genesis`, {
                daw: `GB`, date: ``,
                shortDescription: `Once upon a time...`,
                longDescription: `In sixth grade, my parents gave me an iPhone 6. I found GarageBand on my phone and started recording random notes. Something interesting about GarageBand is that no matter what you write, it always sounds decent. This was one of my first songs on GarageBand and I was very surprised with how it came out.`,
                structure: [ [1, { bpm: 55, timeSignature: [4,4] }], ],
                motifs: [],
            }),

            new Song(`David's Theme`, {
                daw: `GB`, date: ``,
                shortDescription: `A fading man`,
                longDescription: `Here's an interesting fact. The reason this song takes a second to start is because when I first wrote it, I had a bitcrush effect at the end that faded out with the song (the same effect happens at the end of "Cade's Theme"). The effect would sound different depending on what measure it began, so I moved the start of the song over to get the sound I wanted. I couldn't be bothered to move it back after removing the effect months later.\n[Taken from MultiJumper Character Overview]\nDavid Andrews is a low-lying nobody from Earth. He lives in a small apartment on the outskirts of a major city. He often stays in his apartment, usually thinking about what his life could have been. His parents barely call him, so he lives a very lonely life. The first theme is calm and 8-bit. His second theme is nearly entirely composed of drums, incurring a state of panic and worry, along with referencing his hidden love of drums.\nTheme 1: "Rolling Down the Street, in my Katamari" by Fearofdark\nTheme 2: "Drum and Drone" by Justin Hurwitzz\nExtra Theme: "Savior of the Waking World" by Toby Fox`,
                structure: [ [1, { bpm: 95, timeSignature: [4,4] }], ],
                motifs: [ [2, 36, `David's Theme`], ]
            }),

            new Song(`Cynthia's Theme`, {
                daw: `GB`, date: ``,
                shortDescription: `A curious woman`,
                longDescription: `\n[Taken from MultiJumper Character Overview]\nCynthia Davis is a young and imaginative girl who lives with the dying population of humans remaining on Mars. She is the daughter of the king, and is soon to be declared queen. She looks up a lot to her father, and aims to be just like him, though is silently plagued by anxiety and fear. Her themes are piano-based, as that is the instrument she is most familiar with. The second theme inflicts a rising anxiety within the listener, reflecting what it is like to be her.\nTheme 1: "Little Goth" by Lena Raine\nTheme 2: "Anxiety" by Lena Raine\nExtra Theme: "Moonsetter" by Toby Fox`,
                structure: [ [1, { bpm: 90, timeSignature: [4,4] }], ],
                motifs: [],
            }),

            new Song(`Cade's Theme`, {
                daw: `GB`, date: ``,
                shortDescription: `An envious warrior`,
                longDescription: `\n[Taken from MultiJumper Character Overview]\nCade Silven is a rather complicated character. Cade lives on a planet known as Axis, which houses 2 species: Humans and Tredarians. His themes are very synth-filled, to incur a sense of future and coolness within him. He is ego based, so things are pretty loud. During the second theme, things change. With him being a host for a Kerlix, he is filled with blind rage. The second theme is angry sounding, yet melancholy, to say that he's still in there somewhere.\nTheme 1: "Escape from Midwich Valley" by Carpenter Brut\nTheme 2: "Purgatori" by Koraii\nExtra Theme: "Atomyk Ebonpyre" by Toby Fox `,
                structure: [ [1, { bpm: 100, timeSignature: [4,4] }], ],
                motifs: [
                    [9, 17, `Cade's Theme Calm`],
                    [23, 35, `Cade's Theme Calm`],
                ]
            }),

            new Song(`DENIZEN`, {
                daw: `GB`, date: `8/27/2020`,
                shortDescription: `The Keeper of the Multiverse`,
                longDescription: `\n[Taken from MultiJumper Character Overview]\nDenizen is the final and most complicated character. Being the Keeper of the Multiverse, he has mastered just about everything to master, and in turn, is virtually unstoppable. Though he's a good guy, his methods of doing right can seem slightly wrong. Both themes are filled with heavy metal to give a sense of epicness. The first theme gives an introduction to Denizen: fast, calculated, experienced, and cool. The second theme explains Denizen through an angrier aspect. The same feelings are conveyed, except it's all more intense.\nTheme 1: "Leap of Faith" by Cool and New Music Team \nTheme 2: "Last Minute Hero" by Shady Cicada \nExtra Theme: "MeGaLoVania" by Toby Fox`,
                structure: [ [1, { bpm: 75, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 17, `Denizen's Theme`],
                    [5, 9, `Denizen Bass`],
                    [9, 13, `Classic MultiJumper Theme`],
                    [13, 21, `Denizen Bass`],
                    [21, 25, `Denizen's Theme`],
                ],
            }),
            
            new Song(`Ticking`, {
                daw: `GB`, date: ``,
                shortDescription: `As the time goes by...`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [
                    [5, 53, `Ticking`],
                    [37, 53, `Classic MultiJumper Theme`],
                ]
            }),
            
            new Song(`Exoplanet Escape`, {
                daw: `GB`, date: ``,
                shortDescription: `Close one!`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [3,4] }], ],
                motifs: [],
            }),
            
            new Song(`Plot Twisting`, {
                daw: `GB`, date: ``,
                shortDescription: `Wait, what?`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [ [5, 37, `Plot Twisting`], ],
            }),
            
            new Song(`Scarlet Flames`, {
                daw: `GB`, date: ``,
                shortDescription: `Evil!`,
                longDescription: ``,
                structure: [ [1, { bpm: 125, timeSignature: [4,4] }], ],
                motifs: [
                    [29, 37, `Cade's Theme Calm`],
                    [37, 49, `David's Theme`],
                ],
            }),
            
            new Song(`Afraid of the Darkness`, {
                daw: `GB`, date: ``,
                shortDescription: `He comes when you least expect it.`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Sandworm`, {
                daw: `GB`, date: ``,
                shortDescription: `Why is the sand vibrating?`,
                longDescription: ``,
                structure: [ [1, { bpm: 117, timeSignature: [4,4] }], ],
                motifs: [
                    [5, 37, `Sandworm`],
                    [17, 29, `Cade Rage`],
                ],
            }),
            
            new Song(`Breakout`, {
                daw: `GB`, date: ``,
                shortDescription: `Badass!`,
                longDescription: `Dude. First off, the motif at <a>0:14</a> has been evading me for YEARS. `,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 13, `Breakout`],
                    [7.75, 9, `Breakout Lick`],
                    [11.75, 13, `Breakout Lick`],
                    [14, 27, `Denizen's Theme`],
                    [14, 27, `Breakout`],
                    [27, 40, `© Leap of Faith`],
                    [31, 40, `Breakout Bridge`],
                    [40, 48, `Denizen's Theme`],
                    [40, 60, `Breakout`],
                    [48, 56, `Dogwater`],

                ],
            }),
            
            new Song(`Galactic Shift`, {
                daw: `GB`, date: `6/24/2021`,
                shortDescription: `Two protagonists watch a universe detonate`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [
                    [9, 25, `Galactic Shift`],
                    [33, 39, `Galactic Shift`],
                    [39, 40, `Denizen's Theme`],
                    [40, 51, `Galactic Shift`],
                ],
            }),
            
            new Song(`Staredown`, {
                daw: `GB`, date: ``,
                shortDescription: `Two accomplices long past their date of reconciliation`,
                longDescription: ``,
                structure: [ [1, { bpm: 75, timeSignature: [4,4] }], ],
                motifs: [
                    [0.5, 18, `Staredown`],
                    [10, 18, `Ticking`],
                    [18, 19.5, `Denizen's Theme`],
                ],
            }),
            
            new Song(`CADE`, {
                daw: `GB`, date: ``,
                shortDescription: `Knight of Time`,
                longDescription: ``,
                structure: [ [1, { bpm: 130, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 24.75, `Cade Rage`],
                    [33, 41, `Cade's Theme`],
                ],
            }),
            
            new Song(`Stuck Between Verses`, {
                daw: `GB`, date: ``,
                shortDescription: `Trapped in a world beyond reality`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [ [0, 33, `Stuck Between Verses`], ],
            }),
            
            new Song(`The End`, {
                daw: `GB`, date: ``,
                shortDescription: `The end of the Multiverse`,
                longDescription: `As a child, I had an insanely vivid imagination. Like other autistic children, I had the ability to turn sounds into full fledged scenes in my mind. The force that drove the story of MultiJumper was music, and listening to music would be the only thing that could get me to think of ideas to progress the story. That, and walking in circles around the playground.\nAround third grade, when I was deep into my DanTDM phase of Youtube, I had stumbled across his playthrough of Undertale. The video was called <a class='non-time' href='https://www.youtube.com/watch?v=dp0Z5L_Hd2M'>Dandertale</a>, and it was my first introduction to Toby Fox's work. After finishing his streams, I saw comments talking about a "genocide ending" that he did not get. I began to piece together that there was something more to Undertale; something that Dan did not want to engage in for the sake of his extremely young audience.\nSomehow, by the fate of the universe, the content that I found to watch the genocide route with was <a class='non-time' href='https://www.youtube.com/watch?v=KH0m0fFFGuc'>Etika's playthroughs</a>. Now, Etika was a streamer that reflected a culture that I had known nothing about. I was an outsider looking in, and what I saw was fascinatingly adult to my child mind. I was hooked during his playthrough of the genocide route. He said the n-word so much it appalled but fascinated me. Something about Etika was extremely dramatic, but the intensity of his emotions reflected the intensity of my own emotions. His two genocide streams were 8 hours and 5.5 hours each, which were the longest Youtube videos I had ever watched at that point in my life. For an autistic kid with ADHD to sit and watch both videos with such a passion was a miracle. But, I did.\nThrough third, fourth, and fifth grade I had become obsessed with Undertale and Etika. I knew everything about it. I knew all the theories. I knew all the dialogue. I started watching the Youtuber <a class='non-time' href='https://www.youtube.com/@Merg'>Merg</a> to consume more Undertale content. I watched his many, many playthroughs of fangames, and his other videos led me to discover <a class='non-time' href='https://www.youtube.com/watch?v=GiU4aJfKXaQ&list=PLFlcvQw1GNxVHPRxF9nKuFEsAvVUp6BTf'>Just Shapes and Beats</a>, <a class='non-time' href='https://www.youtube.com/watch?v=zDN1AaMaZhE&list=PLFlcvQw1GNxVyP3xXBuOzIFN6F0qMvSkT&index=1'>Hollow Knight</a>, and, most important of all, <a class='non-time' href='https://www.youtube.com/watch?v=7LdUoDmtggA&list=PLFlcvQw1GNxW6huoSHGXn2h5bf8zGqry-'>Celeste</a>.\nBy the time I was midway through fifth grade, I had loosely began connecting with Destin, Garrett, and Landon, although I was still very far from entering their inner friend group. I had gone through Game Theory's theories on Undertale (I remember a day where I specifically showed him the Gaster theories and the Sans is Ness theory). I had moved on to a youtuber called <a class='non-time' href='https://www.youtube.com/@Underlab'>Underlab</a>. He was just another Youtuber in the slew of Undertale youtubers I was watching. But, I ended up watching a random video of his called "<a class='non-time' href='https://www.youtube.com/watch?v=qUGgT3Mzzuw'>What Was The Waterfall Shrine Really Built For?</a>" At 9:30 in the video, he alludes to a character that the Waterfall shrine could be referencing, but dismisses it jokingly. Watching the video, I was confused who that character was, and I basically dismissed it. Some time later, still in fifth grade, I saw another video featuring a similar character, called "<a class='non-time' href='https://www.youtube.com/watch?v=HKY3UESBPA8&list=RDHKY3UESBPA8&start_radio=1'>Megalovania Mashup!</a>" Although the top and bottom left panels heavily confused me, the more rapidly moving top right panel captured my attention. There were so many of those strange characters that appeared in Underlab's video. To top it off, the whole video ends with the unique guitar solo, featuring specifically the top right panel's contents. All of this indicated to me that something about the top right panel was special. Searching the comments, the pinned comment was from a user called @amask4360, who said "I play Undertale; all the comments in the video are about Undertale. I finally read Homestuck; all the comments in the video are about Homestuck." I could only assume Homestuck was the name of what I was seeing. Curious, I dug deeper. That night, my entire life had changed forever.\nFirst, I searched "<a class='non-time' href='https://homestuck.com/'>Homestuck</a>." That night I found the MSPaint Adventures website, which contained all of Andrew Hussie's comics. Hussie was the author and illustrator of the webcomic "Homestuck," which was over 8,000 pages long. As a fifth grader whose reading level was at letter L, the length and density of each page was extremely deterring. The next morning I laid on my bed and read through Hussie's smaller comics. I started with Prison Break and finished with Bard Quest. I didn't touch Problem Sleuth, though. For some reason, I was so excited I found such a gold mine of content that I told my grandma (she was the only adult in the house at that time) all about the stories I read. She really didn't care. That would not be the last time nobody cared about me ranting about Hussie's works.\nI began reading Homestuck later that day. At first, I was confused. It didn't seem that interesting at all. Many words I didn't understand because I was so young, and the culture it contained (Homestuck began on April 13, 2009) was completely foreign to me. I read a few more pages, and decided that I would rely on a tactic my even younger self relied on to read comics: I looked for a dub. I think I just looked up "Homestuck read aloud" or something, and Youtube took me to a <a class='non-time' href='https://www.youtube.com/watch?v=5jMzJaztnFs&list=PLHO1rc05qiGtAidSBy_8jsEOlHXR6x4cd'>playlist by Voice Over Nexus</a> containing a nearly complete dub of the comic, fit with voice actors. Over the next week or two, I would listen to the dub and read along with the pages, all the way up until Act 2, where I got bored and decided to never read it again.\nDespite only having read a little bit of Homestuck, it seemed to stick with me. I didn't really bring it up to anyone at the time. On May 30, 2018, I began my first ever iteration of MultiJumper, and I wrote something in the margin about Homestuck. MultiJumper only really was created out of the inspiration that Homestuck ignited in me. My first idea of the story (as a fifth grader) was a self-insert fanfiction about me getting to visit other 'universes' which contained my favorite video game worlds. The first act of MultiJumper was about me using the machine, the "MultiJumper," (in my head it looked identical to the Wayback machine from Mr. Peabody and Sherman) to travel to The Legend of Zelda: Breath of the Wild, and meet Link and Zelda. I still have this document archived in my MultiJumper Anthology, and it is NOT a good read. I was really obsessed with that game at the time; I remember playing the game and looking for the perfect spot for the MultiJumper to hypothetically crash at. I chose some giant skull on the right coast of the map.\nAnyways, over the Summer break between fifth grade to sixth grade and after many iterations of MultiJumper, I got bored and uninspired again. I picked up Homestuck again, and decided that now that I was entering middle school and was 'maturing,' I would actually read the comic. I loaded up the dub and made it MUCH further. It took me the entire summer to read all the way through all five acts, ending at [S] Cascade, which marked the exact halfway point. I had already explored deep through the rotting tunnels of old Homestuck forums to get most of my context, and I knew that between Act 5 and Act 6 (which was where I was at at the time), Andrew Hussie took a year-long hiatus to think of how to write Act 6. To my surprise, Act 6 was seemingly a total reset of the style of Homestuck back to its roots, and since the characters in Act 6 were 16 rather than 13 (even further from my age of 11 at the time), I was ultimately uninterested. I felt like Sisyphus, having just watched my boulder roll all the way back down to the bottom. I ended up quitting the comic at the half-way point.\nI did not forget Homestuck, though. Despite having quit it, I would not stop talking about it—obsessing over it—and it was starting to get on my friends' nerves. By the end of sixth grade, my friends would scream at me to shut up about Homestuck while they played Fortnite. I was a kid with an autistic interest far, far away from the community people like me had integrated into. Because I grew up with Destin, Garrett, Patrick, Landon, and Clyde, I had essentially been raised to hate "cringe" people. I came to understand that my interests were cringe, and that talking about my interests was only a burden to my friends. My friends weren't inherently malicious (understand that we were middle-schoolers); the problem was that people like me weren't supposed to be friends with people like them. We even came up with slurs for people we thought were cringe: "first-halfers" and "second-halfers." I was a first-halfer, having only read the first half of Homestuck. There weren't many first-halfers in our school. We liked to call people second-halfers much more often: people who had been 'consumed' by cringe. This included people with dyed hair, LGBTQ people, furries, and autistic people. In reality, they were people that had actually found their communities and weren't afraid to show themselves to the world. We were a bunch of immature kids, however, and we didn't understand that. In my early years, I was regarded to be more mature than friends. I understood that there was something wrong with what we were doing, but I knew I couldn't do anything about it. I felt like I didn't belong with my friends. Most of what I liked was bullied out of me. I truly believe that my obsession with self-hatred and my need to belong stemmed from what my friend group was unknowingly doing to me. I really assure you that they were never bad people, though. I came to learn that most of my friends also had interests they weren't willing to share with each other. It's just that they were Fortnite kids and I was an obsessed autistic.\nThis song is something I compiled back in sixth grade. The music of Homestuck was something I utilized while writing MultiJumper. So much so that in my naive dream to finish my MultiJumper series, I would create a huge animation that would visually play out the ending of MultiJumper's fifth act, just like [S] Cascade did in Homestuck. I would queue up many Homestuck songs in Youtube, then play them one after another. My vivid imagination would play out animated scenes, constructing a story. I fine tuned my selection until I got this 15 minute track. I would do this ritual in my room and during long drives. When I started getting really good at GarageBand, I realized I could download each song and place them in order, removing my need to manually switch songs.\nNow, writing this, I must look deep into my memories to remember the sequence of events I had planned for the end of MultiJumper's fifth act.`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 1, `© Solar Voyage`],
                    [1, 2, `© Flare (Cascade Cut)`],
                    [2, 3, `© Creata`],
                    [3, 4, `© Umbral Ultimatum`],
                    [4, 5, `© Eternity Served Cold`],
                    [5, 6, `© Black Hole / Green Sun`],
                ],
                // NEEDS MOTIFS
            }),
        ]),

        // Disc 3: Miscellaneous Songs
        new Disc(null,
        [
            new Song(`Digital Dungeon`, {
                daw: `GB`, date: ``,
                shortDescription: `Simple enough`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Insomnia`, {
                daw: `GB`, date: `12/16/2021`,
                shortDescription: `"I made this song in the middle of the night."`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [ [29, 45, `Buildup`], ],
            }),
            
            new Song(`Relax Song`, {
                daw: `GB`, date: `6/3/2022`,
                shortDescription: `Diaxr Lobby Music`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Off the Rails`, {
                daw: `GB`, date: ``,
                shortDescription: `This one's gonna get crazy!`,
                longDescription: ``,
                structure: [ [1, { bpm: 140, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 7, `Off the Rails`],
                    [7, 9, `Denizen's Theme`],
                    [9, 15, `Off the Rails`],
                    [15, 17, `Denizen's Theme`],
                    [17, 23, `Off the Rails`],
                    [23, 25, `Denizen's Theme`],
                    [33, 57, `Off the Rails`],
                ],
            }),
            
            new Song(`Mushroom Land`, {
                daw: `GB`, date: ``,
                shortDescription: `It's awfully blue`,
                longDescription: `I remember liking this, sending it to Destin, him not liking it, then me not liking it.`,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [],
            }),

            new Song(`Guzheng`, {
                daw: `GB`, date: ``,
                shortDescription: `I found the "more instruments" tab`,
                longDescription: ``,
                structure: [ [1, { bpm: 105, timeSignature: [3,4] }], ],
                motifs: [],
            }),
            
            new Song(`Utopia`, {
                daw: `GB`, date: `1/29/2022`,
                shortDescription: `Trouble in paradise`,
                longDescription: `I specifically remember being literally afraid of the instrument that plays the ascending and descending blues scale in the beginning. It was called, like, "Car Horn" or something, and when played at max velocity it made a frighteningly loud noise.\nAnyways, I wrote this song shortly after joining Jazz Band, so I was just playing around with the blues scale.`,
                structure: [ [1, { bpm: 127, timeSignature: [4,4] }], ],
                motifs: [
                    [2, 18, `Utopia Synth`],
                    [2, 34, `Utopia Choir Calm`],
                    [20.75, 22, `Fight`],
                    [24.75, 26, `Fight`],
                    [34, 58, `Utopia Choir Intense`],
                    [42, 50, `Fight Solo`],
                    [52.75, 54, `Breakout Lick`],
                    [58, 74, `Utopia Choir Calm`],
                ],
            }),

            new Song(`What`, {
                daw: `GB`, date: ``,
                shortDescription: `What`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`This Song Sucks`, {
                daw: `GB`, date: ``,
                shortDescription: `Don't listen to this`,
                longDescription: ``,
                structure: [ [1, { bpm: 83, timeSignature: [6,8] }], ],
                motifs: [],
            }),
            
            new Song(`Groove`, {
                daw: `GB`, date: `12/30/2021`,
                shortDescription: `"Not exactly a song, but rather a collection of various melodies in confluence."`,
                longDescription: `I don't know what inspired me to use the word "confluence," but I guess that's how I would describe this song. I remember sitting down while bored one day and just writing stuff into a GarageBand file. This is what came of it and I'm almost ashamed to say I like the melodies in this song more than most of my more recent songs (as of 8/17/25, at least).`,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 29, `© The Ultimate Showdown of Ultimate Destiny`],
                    [17, 25, `© Flare`],
                    [32, 33, `Fight`],
                    [35.875, 37, `Fight`],
                    [37, 45, `Fight Solo`],
                ],
            }),

            new Song(`Lullaby`, {
                daw: `GB`, date: ``,
                shortDescription: `Calming`,
                longDescription: ``,
                structure: [ [1, { bpm: 85, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Happy Times`, {
                daw: `GB`, date: ``,
                shortDescription: `Little did I know...`,
                longDescription: ``,
                structure: [ [1, { bpm: 70, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Break it Down`, {
                daw: `GB`, date: ``,
                shortDescription: `French guy's theme`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [ [28.5, 37, `Denizen's Theme`], ],
            }),
            
            new Song(`Guitar Loops`, {
                daw: `GB`, date: ``,
                shortDescription: `Get funky!`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 110, timeSignature: [3,4] }],
                    [2, { timeSignature: [4,4] }],
                    [11, { timeSignature: [5,4] }],
                    [12, { timeSignature: [4,4] }],
                ],
                motifs: [],
            }),
            
            new Song(`Epoch`, {
                daw: `FL`, date: ``,
                shortDescription: `My first FL Studio song`,
                longDescription: ``,
                structure: [ [1, { bpm: 125, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Denizen Groove`, {
                daw: `FL`, date: ``,
                shortDescription: `My second FL Studio song`,
                longDescription: ``,
                structure: [ [1, { bpm: 100, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 25, `Denizen's Theme`],
                    [15.75, 17, `Denizen Lick`],
                    [19.75, 21, `Denizen Lick`],
                    [23.75, 25, `Denizen Lick`],
                ],
            }),
            
            new Song(`Radical Synths`, {
                daw: `FL`, date: ``,
                shortDescription: `My third FL Studio song`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [
                    [0.75, 18, `Radical Synths`],
                    [18, 30, `© Leap of Faith`],
                    [22, 30, `Buildup`],
                    [29.75, 38, `Radical Synths`],
                ],
            }),
        ]),

        // Disc 4: Vocal Songs
        new Disc(null,
        [
            new Song(`Amazing Song`, {
                daw: `GB`, date: ``,
                shortDescription: `This one's good`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [],
            }),
            
            new Song(`Sansflower`, {
                daw: `GB`, date: `8/27/2022`,
                shortDescription: `Destin-certified classic`,
                longDescription: ``,
                structure: [ [1, { bpm: 90, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 59, `© Sunflower`],
                    [3, 59, `© MEGALOVANIA`],
                ],
                // NEEDS MOTIFS
            }),
            
            new Song(`Totinos`, {
                daw: `GB`, date: ``,
                shortDescription: `Memories...`,
                longDescription: ``,
                structure: [ [1, { bpm: 120, timeSignature: [4,4] }], ],
                motifs: [
                    [0, 25, `Totinos`],
                    [37, 41, `Totinos`],
                ],
            }),
        ]),
    ]),

    // THE DOGS CLIMB CELESTE OST

    new Album(`The Dogs Climb Celeste OST`, null,
    [
        // Disc 1
        new Disc(`cover_TDCC_1`,
        [
            new Song(`The Dogs`, {
                alternativeNames: [`Dog Lobby Music`],
                daw: `FL`, date: `9/5/2022`,
                shortDescription: `The theme of the Dogs`,
                longDescription: `This song is a combination of Celeste's main theme and the old lobby music from Fortnite. Fortnite was a big part of my friend group's history and I personally loved Celeste, so I knew I just had to do it.\nI wanted to solidify the main themes and personalities of each of the protagonists: Brannon (piano), Destin (drums), Garrett (koto), Landon (strings), Patrick (clarinet). Of course, me being me, I never actually established a true motif for anyone, except for maybe Garrett and Patrick. The characters would each have their respective calm and intense instruments, although even that thematic idea got mixed up later in production.`,
                structure: [
                    [1,  { bpm: 80, timeSignature: [4,4], keySignature: 'E Major' }],
                    [9,  { bpm: 53 }],
                    [10, { bpm: 100 }],
                ],
                motifs: [
                    [10, 66, `© Fortnite OG Lobby`],
                    [10, 18, `© Celeste Theme`],
                    [21.75, 23, `© Celeste Theme`],
                    [34, 42, `Garrett Riff`],
                    [43, 44, `Dogs Rundown`],
                    [50, 58, `Patrick's Theme`],
                    [51, 52, `Lust`],
                    [55, 56, `Lust`],
                ],
            }),

            new Song(`Reunion`, {
                daw: `FL`, date: `3/16/2023`,
                shortDescription: `A man reunites with three friends he hasn't seen in five years`,
                longDescription: `TDCC is about the fragility of friendship, as well as the anxiety of reconnecting with long-lost friends after a long time of not seeing them. This song, being the first actual scene in the book, is about the latter.\nIf you feel a distant sense of familiarity at <a>0:52</a>, please know that you are not going crazy. This is in fact an altered rendition of Ree Kid's "Totinos Hot Pizza Rolls" with the leading melody. I chose this melody as the "calm" theme of The Dogs because it was something everybody listened to when we were younger. I associated that melody with better memories.`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Long Drive`, {
                alternativeNames: [`Seven Eight`],
                daw: `FL`, date: `10/28/2023`,
                shortDescription: `Four friends hit the road to Vancouver`,
                longDescription: `I originally wrote this song out of boredom; it actually had nothing to do with TDCC at first, but I decided to spice it up. I would end up doing this a lot with quite a few of my songs.\nThis was the first song I had ever written in cut time. Cut time is when a song bounces between time signatures every measure. This song bounces between 3/4 and 4/4, but you can think of it as 7/4 if you wanted to.\nThe voice at <a>2:33</a> is Destin's voice. Everything after that is conjured up for the TDCC soundtrack.`,
                structure: [
                    [1, { bpm: 78, timeSignature: [7,4] }],
                    [5, { timeSignature: [4,4] }],
                    [6, { timeSignature: [7,4] }],
                    [30, { timeSignature: [1,4] }],
                    [31, { timeSignature: [7,4] }],
                    [35, { timeSignature: [1,8] }],
                    [36, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Prologue`, {
                daw: `FL`, date: `11/21/2022`,
                shortDescription: `A conversation with an old woman`,
                longDescription: `This is the TDCC equivalent of the Prologue from Celeste. The little 5/8 part at <a>0:42</a> is sprinkled with an angry Destin motif to convey his frustration with the old lady.\nThe bridge collapse sequence at <a>1:35</a> is way longer than Celeste's actual bridge collapse sequence. You may also notice that it's also a remix of a song from the game "<a class="non-time" href="https://changed.wiki.gg/">Changed</a>" called "<a class="non-time" href="https://www.youtube.com/watch?v=2NAFbkFDmAQ">White Tail Chase</a>." More on that game in my song "Cringe."`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Now or Never`, {
                daw: `GB`, date: `2/4/2022`,
                shortDescription: `A physical manifestation of regret, somehow`,
                longDescription: `Despite the absolutely atrocious lack of mastering on this song, it still grooves pretty well. This song plays during the first battle in TDCC, where we suddenly have to go up against an enemy called a Cringling. This song actually is the same key, time signature, and tempo as my other song "Cringe," which further emphasizes the type of enemy you fight here.`,
                structure: [ [1, { bpm: 150, timeSignature: [6,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`City Tumble`, {
                daw: `GB`, date: `2/7/2023`,
                shortDescription: `Falling through loose vines in a collapsed building`,
                longDescription: `This song actually made it in pretty late compared to the rest of the GarageBand songs. I actually found this song in a folder on my old phone and decided to bring it to the TDCC soundtrack mainly because I didn't think it deserved to be forgotten.\nI spiced up this song to be the one that plays when I fall through a roof in the Forsaken City. Saying that out loud makes me feel kind of gross.`,
                structure: [ [1, { bpm: 105, timeSignature: [3,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            // There's a tricky motif at 2:05 in Lead Synth
            new Song(`Attack on Big Rock`, {
                daw: `GB`, date: `3/12/2022`,
                shortDescription: `It's literally just a rock`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Furious Haze`, {
                daw: `FL`, date: `5/20/2023`,
                shortDescription: `A distant memory of an intoxicated breakdown`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 135, timeSignature: [1,8] }],
                    [2, { timeSignature: [4,4] }],
                    [13, { bpm: 100 }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Tesotrix`, {
                daw: `GB`, date: `3/19/2022`,
                shortDescription: `It kinda looks like it's made of jello...`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Cringe`, {
                alternativeNames: [`Cringe's Theme`],
                daw: `GB`, date: `1/3/2022`,
                shortDescription: `Part of You`,
                longDescription: `Most of this song is a rip from a song called "<a class="non-time" href="https://www.youtube.com/watch?v=QSenhRBQPtc">White Goo Jungle</a>" written for the <a class="non-time" href="https://changed.wiki.gg/">Changed</a> soundtrack. <a class="non-time" href="https://changed.wiki.gg/">Changed</a> is a furry slime game that Patrick showed me in art class in seventh grade. Up to that point, I hadn't really known much about furries, and when I looked up gameplay of the game, I was horrified to see a bunch of strange goo kinks. I called Patrick on Discord and we watched a full video of no-commentary gameplay. It was a like cringe-infested movie, and the whole time we were writhing in our seats watching the most awful and weirdly sexual things happening to the protagonist. We ended up really enjoying the act of watching really cringy things together, and I coined the event a "cringe binge." Turns out, I wasn't actually the first person to come up with the term, but I thought I was.\nWhen writing this song, I wanted to go for an "Oh, THIS GUY again?" mood, similar to Toby Fox's theme for Karkat Vantas from Homestuck. I considered this song to be one of my best works; I was infatuated with listening to this song, even while doing other things.\nThe jingle at <a>0:57</a> is actually a melody from a song I have permanently lost. On my old iPhone, it was called something like "Dance Off" or something. The melody was in 4/4 and in swing tempo, but I made it 3/4 and put it in Cringe's theme just because I wanted to experiment. Thankfully, the melody lives on through this song.\nThis song was also a subtle dump of my own insecurities (mainly, how I feared others saw me: as an annoying, unlikeable person). It would take years for me to realize that the reason I felt this way was because of the way my friend group acted towards not just me, but everyone who didn't share similar philosophies as them.\nCringe, the character in TDCC, started off as a combination of everything that I saw wrong in myself, but as I kept writing, I began to understand that he was really a manifestation of my self-hatred. Interestingly, the time I realized that was right when I was writing the resolution scenes in TDCC.`,
                structure: [ [1, { bpm: 150, timeSignature: [3,4] }], ],
                motifs: [ 
                    [1, 73, `© White Goo Jungle`],
                    [41, 49, `Denizen Bass`],
                    [49, 65, `Cringe's Theme`],
                    [63, 65, `Denizen's Theme`],
                ],
            }),
            
            new Song(`Your Shadow`, {
                alternativeNames: [`Cringe Fight - Ruins`],
                daw: `GB`, date: `12/20/2021`,
                shortDescription: `The incarnate of cringe, in the flesh`,
                longDescription: `This song was so good when I made it. Coming back to it now, it was kinda just random garbage. It still feels like a I'm-not-supposed-to-be-fighting-this-guy kind of boss, though.\nThe Among Us Drip melody plays at <a>1:57</a>. I put that in there because I thought it was funny. When I posted the <a class='non-time' href='https://www.youtube.com/watch?v=386KYM662OE&t=5s'>Youtube video</a> for the TDCC soundtrack, someone commented that they heard this and I was amazed that someone actually made it this far into the soundtrack to hear that. As I type this, I just found out that the comment no longer exists on the video, which is weird.\nThe part that plays at <a>3:08</a> is actually a completely separate song that I threw on to the end and immediately deleted the original file. That song was called "ALIVE," and it was going to be part of the MultiJumper soundtrack.`,
                structure: [
                    [1, { bpm: 86, timeSignature: [2,4] }],
                    [2, { bpm: 93, timeSignature: [4,4] }],
                    [18, { bpm: 115 }],
                    [62, { timeSignature: [2,4] }],
                    [63, { timeSignature: [7,32] }],
                    [64, { bpm: 90, timeSignature: [4,4] }],
                    [83, { bpm: 85, timeSignature: [2,4] }],
                    [84, { bpm: 120, timeSignature: [4,4] }], // Staredown motif somewhere here
                ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Ghost Hunting`, {
                daw: `GB`, date: `3/24/2022`,
                shortDescription: `Every game needs a slime`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 110, timeSignature: [4,4] }],
                    [2, { timeSignature: [3,4] }],
                    [6, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Concierge Crackdown`, { alternativeNames: [`Escaping the Temple`], daw: `GB`, date: `12/18/2021`,
                shortDescription: `Escaping a collapsing haunted hotel`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 115, timeSignature: [4,4] }],
                    [19, { timeSignature: [7,8] }],
                    [50, { timeSignature: [4,4] }],
                    [63, { timeSignature: [7,8] }],
                    [64, { timeSignature: [4,4] }],
                    [84, { timeSignature: [7,8] }],
                    [107, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Whirlwind Warfare`, {
                daw: `FL`, date: `4/28/2023`,
                shortDescription: `A wind-based manifestation of the mountain's magic`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 130, timeSignature: [4,4] }],
                    [90, { timeSignature: [3,4] }],
                    [91, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Far Above`, {
                daw: `GB+FL`, date: `10/1/2023`,
                shortDescription: `Peace, suspended in the air`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 55, timeSignature: [6,4] }],
                    [2, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Seborrhea`, {
                daw: `GB`, date: `3/21/2022`,
                shortDescription: `Chaos, suspended in the air`,
                longDescription: `Something about this song used to fill me with so much dopamine. With a bit of mastering, this song could probably hold up even now.\nI had been itching for a long time to incorporate those classic orchestral hits in a song, but I couldn't for the life of me find them anywhere in the GarageBand library. All I could find was some knock-off hits, so that's what I used. I couldn't figure out how to sample the sound into a piano roll, so I instead manually placed each sound and altered the pitch of each hit.\nI distinctly remember a few problems I had with the start of this song. You should be able to hear a very heavy but somewhat distant bitcrushed bass that mirrors the notes of the orchestral hits. I put this bass in here (I'm pretty sure I copied the presets from "Your Shadow") because I remember the start feeling way to empty. I wanted to convey the stress of a monster wreaking havoc on a rusty gondola's that's hanging by a thread above a bottomless pit. This isn't really important information, but I find it interesting that I remember such a decision so strongly.\nThe fading in and out from Landon's synth (can be heard at <a>0:17</a> among other places) is supposed to reflect that this chapter is mainly about Landon, and that the threat requires a Landon solution. More interestingly, I had just finished my first All-Region Clinic from eighth grade, and we played The Great Locomotive Chase. Hayden Fontaine was assigned the marimba on this piece, and in the song he played crescendo-ing chords that were supposed to represent a part of the train. I REALLY liked the sound this created, and I mimicked that effect here.\nAt <a>1:32</a> is where another lost song's motif can be heard. I really don't remember the name of it from my old iPhone, but I remember it being really weird. I think it had the word "bells" in its name? Whatever it was, it had some variations of Megalovania, because of course it did, but more importantly, it had this haunting melody that would echo all the way through it. I included the melody to experiment, but not before heavily bitcrushing it.\nTo further include references to Landon, I put a drum break at <a>2:02</a> solely because I made Landon listen to "Puzzle Music" and he said he loved the drums, so I copied those exact drums and changed the drumset. You can also hear these drums through the whole song, but this part is where they're most audible.\nMy favorite part of this song is the snare hits at <a>0:42</a>.`,
                structure: [ [1, { bpm: 130, timeSignature: [4,4] }], ],
                motifs: [ [51, 67, `Forgotten Bells`], ],
            }),
        ]),

        // Disc 2
        new Disc(`cover_TDCC_2`,
        [
            new Song(`Puzzle Music`, {
                daw: `GB`, date: `11/9/2021`,
                shortDescription: `Whatever could it mean?`,
                longDescription: ``,
                structure: [ [1, { bpm: 111, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Beyond`, {
                daw: `GB`, date: `3/8/2022`,
                shortDescription: `Enter the mirror`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 110, timeSignature: [4,4] }],
                    [20, { bpm: 120 }],
                    [50, { timeSignature: [3,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Clueless`, {
                daw: `GB`, date: `3/27/2022`,
                shortDescription: `Wandering endlessly in a foggy landscape`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 83, timeSignature: [4,4] }],
                    [7, { timeSignature: [3,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Heartbreak`, {
                daw: `GB`, date: `3/23/2023`,
                shortDescription: `Memories of a broken heart`,
                longDescription: ``,
                structure: [ [1, { bpm: 78, timeSignature: [3,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Scopoclaustria`, {
                daw: `GB`, date: `4/10/2022`,
                shortDescription: `An unholy amalgamation of two friends' worst fears and desires`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Old Friend`, {
                daw: `GB`, date: `1/13/2022`,
                shortDescription: `Once killed in a tragic accident, this old friend's surely been worked to the bone`,
                longDescription: ``,
                structure: [ [1, { bpm: 114, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Campfire & Moonjump`, {
                daw: `GB`, date: `2/12/2022`,
                shortDescription: `Disaster after disaster`,
                longDescription: `We all sit by a campfire enjoying the northern lights, finally getting a chance to enjoy each other's company as <em>real</em> friends.\nEveryone's GarageBand themes (their close themes) are shown off in this song to give a sense of childish innocence. Because this scene is the first scene where I, as a character, feel truly comfortable, my close motif is finally revealed.\nIf you listen very, very carefully at <a>2:22</a>, you can hear the Beyond motif. You may notice that I actually made this song before I made Beyond, though. The Beyond motif actually belongs to another forgotten song of mine, which was going to be used in MultiJumper. It was one of my strangest melodies, and GarageBand allow for unique time signatures so I never finished the song. On my iPhone it was called something like "Temple Ruins" and it was supposed to play when David and Cynthia explored the planet Obmil at the start of Act 2. Obviously, I never made it that far in writing, though.\n<a>2:39</a> and on may be one of my favorite old Pessimist song moments, honestly. The use of the Utopia synth here is a bit of musical irony, as this part marks the beginning of the plot's steep downward spiral. It's here that my action motif appears, and although I barely used it ever again, it's one of my favorite melodies. This is the part where Destin and I start an argument about why I brought everyone to the mountain in the first place, as I had just revealed the truth behind my motives. The argument escalates, and, writing from years of experience, I bring the reader through one of many possible climaxes of Destin and I's friendship. I wrote from months and months of growing hatred and jealousy, and "VS DIAXR" would be the moment I had been dreaming of writing for months.\nSide note: After Destin (the real Destin) read this chapter, he told me that I wrote his dialogue perfectly. Everything he thought as a reader came out of his character's mouth, which meant I predicted his character perfectly. The truth was, I was so used to the tactics Destin used to win arguments throughout our years of friendship that I could basically predict what he was going to say, and despite that, I still couldn't formulate good enough responses in real life.`,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`VS DIAXR`, {
                alternativeNames: [`Hate`],
                daw: `FL`, date: `2/23/2023`,
                shortDescription: `Every emotion, every mistake, all at once`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Culture Shock`, {
                daw: `FL`, date: `3/25/2022`,
                shortDescription: `Running from the inescapable`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 90, timeSignature: [4,4] }],
                    [27, { bpm: 97 }],
                    [28, { bpm: 170 }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Nightbreak`, {
                daw: `FL`, date: `2/18/2023`,
                shortDescription: `Heart on fire, mind on ice`,
                longDescription: ``,
                structure: [ [1, { bpm: 120, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Rock Bottom`, {
                daw: `GB`, date: `3/13/2022`,
                shortDescription: `Heart on ice, mind on fire`,
                longDescription: ``,
                structure: [ [1, { bpm: 80, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Core`, {
                daw: `GB+FL`, date: `2/1/2023`,
                shortDescription: `A single soul knows no bounds`,
                longDescription: ``,
                structure: [ [1, { bpm: 100, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Eye of the Storm`, {
                alternativeNames: [`Cringe Fight - Reflection`],
                daw: `GB`, date: `11/23/2021`,
                shortDescription: `What is the price of redemption?`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [
                    [10, 16, `Rock Bottom Choir`],
                    [16, 18, `© Among Us Drip`],
                    [18, 24, `Rock Bottom Choir`],
                    [21, 22, `Denizen's Theme`],
                    [24, 26, `© Among Us Drip`],
                    [24, 26, `Totinos`],
                    [28, 41, `Denizen's Theme`],
                    [28, 41, `Breakout`],
                    [41, 53, `© Leap of Faith`],
                    [45, 53, `Breakout Bridge`],
                    [51, 53, `Totinos`],
                    [54, 74, `Breakout`],
                    [54, 62, `Denizen's Theme`],
                    [60.75, 62, `Breakout Lick`],
                    [62, 70, `Dogwater`],
                    [68.75, 70, `Breakout Lick`],
                ],
            }),
            
            new Song(`Resolve`, {
                daw: `FL`, date: `3/2/2023`,
                shortDescription: `The truth`,
                longDescription: `This song's about coming to terms with self-hatred.`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`No Hard Feelings`, {
                daw: `FL`, date: `3/2/2023`,
                shortDescription: `Splintered pieces of wood, shattered fragments of friendship`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 105, timeSignature: [4,4] }],
                    [17, { bpm: 53 }],
                    [18, { bpm: 95 }],
                    [50, { bpm: 112, timeSignature: [5,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }), 
        ]),

        // Disc 3
        new Disc(null,
        [
            // Part A
            new Song(`Gilburt`, {
                alternativeNames: [`Gilbert`],
                cover: `cover_TDCC_3A`,
                daw: `GB`, date: `5/24/2023`,
                shortDescription: `Slimy thing`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Let's Bargain`, {
                cover: `cover_TDCC_3A`,
                daw: `FL`, date: `10/22/2023`,
                shortDescription: `A deal with Ego`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Fluffy Dandruff`, {
                cover: `cover_TDCC_3A`,
                daw: `FL`, date: `8/19/2022`,
                shortDescription: `This curse was not meant for him`,
                longDescription: ``,
                structure: [ [1, { bpm: 135, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`CRINGALICIOUS`, {
                alternativeNames: [`Cringe Fight - Summit`],
                cover: `cover_TDCC_3A`,
                daw: `GB`, date: `3/7/2022`,
                shortDescription: `There is a monster in every person`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 110, timeSignature: [3,8] }],
                    [2, { timeSignature: [3,4] }],
                    [34, { timeSignature: [3,8] }],
                    [35, { bpm: 129, timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Raturn`, {
                cover: `cover_TDCC_3A`,
                daw: `FL`, date: `6/9/2023`,
                shortDescription: `Locked away, a mind lays`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`BATTLE OF THE DOGS`, {
                cover: `cover_TDCC_3A`,
                daw: `FL+BG`, date: `11/23/2022`,
                shortDescription: `A war against humanity and one of its creations gone rogue`,
                longDescription: `This song holds a special place in my heart, despite it being nearly a direct rip of Shady Cicada's "Last Minute Hero." Since I was a kid, I used to listen to his song and imagine insanely vivid fight sequences. When I brainstormed ways to make the final battle atop the summit of Mount Celeste seem as climactic as possible, I couldn't help but directly use the song that inspired so many similar ideas. It felt fitting to pay a homage to the song by including it in the soundtrack for the scene.\nThis song had come a very long way, too. The idea of "Battle of the Dogs" being rooted in "Last Minute Hero" had been circling my mind for years at that point, and about half of the song that isn't Last Minute Hero is taken from my earlier GarageBand rendition. As a result, this song was a combination of eras from GarageBand and FL Studio, which fits very nicely with what exactly this song is trying to convey: the clashing of two worlds.\nThe more I learned about Destin's past, the more significant our differences were to me. This song is mainly about Destin and I's pasts; particularily, our memories. If you ever have the misfortune of reading TDCC, you'll know that this scene is absolutely ridiculous. A whole team of Destin's past friend group (all of which are real people who have no idea they are in this story) fight off against protagonists of my past obsessions and cringe-binges. My main goal was to make Destin squirm but remain amazed while reading the fight scene, and it worked.\nIn the FL Studio project file for this song, I also toyed with an idea to make the song even longer by including little bursts of themes for each of Destin's friends. I ended up scrapping the idea, but kept Pug's theme as a small break in the song. The rest of the idea became the song "Threats, Threats" and can be found in TDCC's Forgotten Extras.\nAnecdote: I specifically remembering making Scottie listen to "Last Minute Hero" in fourth grade near the end of the year. I gave her headphones and played it on the ipad during our free time. I remember her looking very impressed and I was so happy.`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`The Heart`, {
                cover: `cover_TDCC_3A`,
                daw: `FL`, date: `11/13/2022`,
                shortDescription: `Shatter the soul. Know no bounds. Enter the abyss`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 112, timeSignature: [4,4] }],
                    [18, { timeSignature: [7,8] }],
                    [19, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            // Part B
            new Song(`Eternum`, {
                cover: `cover_TDCC_3B`,
                daw: `FL`, date: `6/23/2023`,
                shortDescription: `Call of the void`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`You've Got This`, {
                cover: `cover_TDCC_3B`,
                daw: `FL`, date: `2/26/2023`,
                shortDescription: `Finding power in hope`,
                longDescription: ``,
                structure: [ [1, { bpm: 100, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`PESSIMISM`, {
                alternativeNames: [`FINALE`],
                cover: `cover_TDCC_3B`,
                daw: `FL`, date: `2/26/2023`,
                shortDescription: `WHAT HOPE DO YOU HAVE AGAINST YOURSELF?`,
                longDescription: `Despite the obvious plagiarism of the Terraria Calamity Mod's Boss Rush track, this song was the most chaotic song I had ever made, and I intended it to sound that way.\nThis song was the culmination of a whole year of stress, jealousy, and hatred. The weight of my first year of marching band had crumbled on top of me and I felt genuine, soul-crushing hatred towards Destin, seeing him as a manipulative hero that people would mistakenly idolize. I had never hated myself more for how I felt.\nThis song is my fight against the part of myself that convinced me I was an evil, rotten person. To me, this song was ego death. This song was my attempt to purge the evil from my body, but, obviously, I knew deep down that parts of me would forever remain.`,
                structure: [
                    [1, { bpm: 160, timeSignature: [1,16], keySignature: 'D Minor' }],
                    [2, { bpm: 28, timeSignature: [1,16] }],
                    [3, { bpm: 160, timeSignature: [1,4] }],
                    [4, { timeSignature: [4,4] }],
                    [12, { timeSignature: [5,4] }],
                    [36, { timeSignature: [1,4] }],
                    [37, { timeSignature: [5,4] }],
                    [45, { timeSignature: [4,4] }],
                    [53, { timeSignature: [5,4] }],
                    [77, { timeSignature: [1,4] }],
                    [78, { timeSignature: [5,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`PERSISTENCE`, {
                cover: `cover_TDCC_3B`,
                daw: `GB`, date: ``,
                shortDescription: `Finishing the job`,
                longDescription: ``,
                structure: [ [1, { bpm: 112, timeSignature: [3,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Wake Up`, {
                cover: `cover_TDCC_3B`,
                daw: `FL`, date: `7/28/2023`,
                shortDescription: `I'm sorry`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 90, timeSignature: [4,4] }],
                    [19, { timeSignature: [3,4] }],
                    [20, { bpm: 74, timeSignature: [4,4] }],
                    [32, { bpm: 90 }],
                    [35, { timeSignature: [9,8] }],
                    [36, { timeSignature: [4,4] }],
                    [39, { timeSignature: [9,8] }],
                    [40, { timeSignature: [4,4] }],
                    [43, { timeSignature: [9,8] }],
                    [44, { timeSignature: [4,4] }],
                    [50, { timeSignature: [2,4] }],
                    [51, { bpm: 123, timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Dogs Rap Battle`, {
                alternativeNames: [`Fortnite Sans Battle`],
                cover: `cover_TDCC_3B`,
                daw: `GB`, date: `2/5/2022`,
                shortDescription: `The End`,
                longDescription: ``,
                structure: [ [1, { bpm: 95, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),

        // Disc 4
        new Disc(`cover_TDCC_4`,
        [
            new Song(`A Battle is Afoot!`, {
                daw: `FL`, date: `4/8/2023`,
                shortDescription: `Optional enemy fight theme`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Cringe-Bingers`, {
                daw: `FL`, date: `3/19/2023`,
                shortDescription: `Theme of the Cringe-Bingers`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 95, timeSignature: [4,4] }],
                    [37, { timeSignature: [2,4] }],
                    [38, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Doug it Out`, {
                alternativeNames: [`W Rizz`],
                daw: `FL`, date: `2/23/2023`,
                shortDescription: `Theme of the sixth friend`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 95, timeSignature: [4,4] }],
                    [53, { timeSignature: [2,4] }],
                    [54, { timeSignature: [4,4] }],
                    [66, { bpm: 100, timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`FIGHT!`, {
                daw: `GB+FL`, date: `11/11/2023`,
                shortDescription: `Alt fight theme`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 110, timeSignature: [5,4] }],
                    [2, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Song That Might Play When You Fight Diaxr`, {
                daw: `FL`, date: `7/16/2022`,
                shortDescription: `Alt track to "VS DIAXR"`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Chug Gluggles`, {
                daw: `GB`, date: ``,
                shortDescription: `Alt credits theme`,
                longDescription: ``,
                structure: [ [1, { bpm: 102, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),
    ]),

    // TDCC'S FORGOTTEN EXTRAS

    new Album(`TDCC's Forgotten Extras`, `cover_TDCC_FX`,
    [
        // Disc 1
        new Disc(null,
        [
            new Song(`A Doggy Christmas`, {
                daw: `GB`, date: ``,
                shortDescription: `Yeah, I'll eat the cookies later...`,
                longDescription: ``,
                structure: [ [1, { bpm: 60, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Trekking`, {
                daw: `GB`, date: `1/22/2022`,
                shortDescription: `Up and up`,
                longDescription: ``,
                structure: [ [1, { bpm: 95, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Cringe Pub`, {
                daw: `GB`, date: ``,
                shortDescription: `Care for a drink?`,
                longDescription: ``,
                structure: [ [1, { bpm: 100, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Old Dogs`, {
                daw: `GB`, date: ``,
                shortDescription: `The original theme of the Dogs`,
                longDescription: ``,
                structure: [ [1, { bpm: 80, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Oddball`, {
                daw: `GB`, date: `11/10/2021`,
                shortDescription: `Temper`,
                longDescription: ``,
                structure: [ [1, { bpm: 89, timeSignature: [4,4], keySignature: 'G Minor' }] ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`I Love Destiny 2`, {
                daw: `GB`, date: ``,
                shortDescription: `Dandruff`,
                longDescription: ``,
                structure: [ [1, { bpm: 125, timeSignature: [4,4], keySignature: 'C Minor' }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Homestuckian`, {
                daw: `GB`, date: ``,
                shortDescription: `Cringe`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4], keySignature: 'C Major' }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Gamed and Bamed`, {
                daw: `GB`, date: ``,
                shortDescription: `Magic`,
                longDescription: `I remember really liking the drums in this song. I was so eager to impress Destin with his theme for my new novel I was writing. He ended up upsetting me by telling me he didn't like the theme very much and that it was specifically the drums that he didn't like.\nThe voices you can hear at <a>0:38</a> are from the 2018 RLCS championships, where JSTN makes a zero-second-goal at the end of a game to make it to overtime. Destin showed me this moment and I found it fascinating to see him so passionate about something I barely cared about at the time. Really made me think.`,
                structure: [ [1, { bpm: 100, timeSignature: [4,4], keySignature: 'D Minor' }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Dogwater`, {
                daw: `GB`, date: ``,
                alternativeNames: [`Destin's Theme`],
                shortDescription: `Reticence`,
                longDescription: `After the disappointment of Destin's previous theme, I tried my hand at another approach, hoping to win back his approval or whatever. This time, I really tried to play even further into his interests. I recalled that he enjoyed big, brassy sounds in orchestral pieces, so I used just that.\nThe voice you can hear at <a>0:50</a> is actually the very first word spoken on the infamous Chase Plays Youtube channel, which began exactly on April 16, 2021 with his first video: "<a class="non-time" href="https://youtu.be/10mgMh9Hjto">welcome to the chase crew</a>." He would end up privating many of his videos years later after my friend group made fun of him for his channel by going "Dude, is that CHASE PLAYS?" Anyways, here's his <a class="non-time" href="https://youtu.be/93wtZEKLC8I">third</a> and <a class="non-time" href="https://youtu.be/ef-ErsXZqqo">fourth</a> video, too.\nThe actual "theme" of this song comes in after the Chase Plays segment, and is a harmony of Destin's goal theme from Rocket League, which was the Overtime Theme. Since I respected Destin so much, I didn't even plagiarize from the theme, I just wrote a harmony for it while using the plagiarism in the background.`,
                structure: [
                    [1, { bpm: 115, timeSignature: [4,4], keySignature: 'C Minor' }],
                    [25, { bpm: 110, timeSignature: [2,4] }],
                    [26, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Get Doyled`, {
                daw: `GB`, date: ``,
                shortDescription: `Glaze`,
                longDescription: ``,
                structure: [ [1, { bpm: 100, timeSignature: [4,4], keySignature: 'C Minor' }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Threats, Threats (Full)`, {
                daw: `FL`, date: `11/23/2022`,
                shortDescription: `Destin's 12 friends`,
                longDescription: ``,
                structure: [ [1, { bpm: 115, timeSignature: [4,4], keySignature: 'F# Minor' }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Clyde & Brannon`, {
                daw: `FL`, date: `2/18/2023`,
                shortDescription: `The right people in the wrong place`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 83, timeSignature: [4,4], keySignature: 'C Minor' }],
                    [9, { bpm: 86 }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Patrick but it's sans`, {
                daw: `FL`, date: `10/1/2022`,
                shortDescription: `No comment`,
                longDescription: ``,
                structure: [ [1, { bpm: 65, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Patrick's Ascension`, {
                daw: `FL`, date: `11/17/2022`,
                shortDescription: `Eventually replaced by "Raturn"`,
                longDescription: ``,
                structure: [ [1, { bpm: 120, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Spooky Minisynth`, {
                daw: `FL`, date: `12/16/2022`,
                shortDescription: `I just thought this song was spooky`,
                longDescription: ``,
                structure: [ [1, { bpm: 118.99, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`The Abyss`, {
                daw: `FL`, date: `12/25/2022`,
                shortDescription: `Eventually replaced by "Eternum"`,
                longDescription: ``,
                structure: [ [1, { bpm: 110, timeSignature: [3,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Something Coming`, {
                daw: `FL`, date: `4/7/2023`,
                shortDescription: `Hide!`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 85, timeSignature: [1,8] }],
                    [2, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Perfect Cringe`, {
                daw: `FL`, date: `3/4/2023`,
                shortDescription: `Back when there was no Lust`,
                longDescription: ``,
                structure: [ [1, { bpm: 105, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`512`, {
                daw: `FL`, date: `10/23/2022`,
                shortDescription: `The End?`,
                longDescription: ``,
                structure: [ [1, { bpm: 60, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Song That Plays in a Dance-Off`, {
                alternativeNames: [`Cringe Dance-Off`],
                daw: `FL`, date: `6/19/2022`,
                shortDescription: `"I'll reupload this later when I improve it a bit more"`,
                longDescription: `The melodies of this song were actually taken from Smash Mouth's "All Star" in negative harmony.`,
                structure: [ [1, { bpm: 110, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),
    ]),

    // STUFF & THINGS VOL. 2

    new Album(`Stuff & Things Vol. 2`, `cover_StuffNThings_2`,
    [
        // Disc 1
        new Disc(null,
        [
            new Song(`Piano 1`, {
                daw: `FL`, date: `7/24/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Piano 2`, {
                daw: `FL`, date: `10/13/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Piano 3`, {
                daw: `FL`, date: `7/10/2024`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Silly Goofy`, {
                daw: `FL`, date: `11/22/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Sax Solo`, {
                daw: `FL`, date: `6/23/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Braek`, {
                daw: `FL`, date: `7/4/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Magic Forest`, {
                daw: `FL`, date: `1/7/2024`,
                shortDescription: ``,
                longDescription: `This is the first time I found the "Royal" instrument in FL Studio's FLEX plugin. I really liked the foreboding tone of the instrument and went on to use it in "The Worm."`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Emotional`, {
                daw: `FL`, date: `1/17/2024`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Strange Music`, {
                daw: `FL`, date: `5/7/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Maybe Jazz`, {
                daw: `FL`, date: `5/22/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Phonke`, {
                daw: `FL`, date: `9/18/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Groove (2)`, {
                daw: `FL`, date: `10/12/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Space-Like Tune`, {
                daw: `FL`, date: `12/12/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Hot Day`, {
                daw: `FL`, date: `8/4/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Hotter Day`, {
                daw: `FL`, date: `8/7/2022`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Little`, {
                daw: `FL`, date: `10/9/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Warm`, {
                daw: `FL`, date: `10/14/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Withdrawn`, {
                daw: `FL`, date: `1/20/2024`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Another Cringe`, {
                daw: `FL`, date: `4/13/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),

        // Disc 2
        new Disc(null,
        [
            /*new Song(`Synthy`, {
                daw: `FL`, date: `8/3/2025`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),*/
            
            new Song(`Turn Everyone to Sludge Please`, {
                daw: `FL`, date: `8/5/2025`,
                shortDescription: `A song in difficult time signatures`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 120, timeSignature: [15,16] }],
                    [23, { timeSignature: [5,8] }],
                    [25, { timeSignature: [7,8] }],
                    [26, { timeSignature: [6,4] }],
                    [27, { timeSignature: [5,8] }],
                    [29, { timeSignature: [4,4] }],
                    [31, { timeSignature: [5,8] }],
                    [33, { timeSignature: [4,4] }],
                    [35, { timeSignature: [3,4] }],
                    [36, { timeSignature: [15,16] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Knives`, {
                daw: `FL`, date: `8/5/2025`,
                shortDescription: `A song to fight composer's block`,
                longDescription: ``,
                structure: [ [1, { bpm: 140, timeSignature: [4,4] }] ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`LOCRIAN`, {
                daw: `FL`, date: `8/7/2025`,
                shortDescription: `A song in C Locrian`,
                longDescription: `I challenged myself to write this song in the "Locrian" mode, which is one of six musical "modes." Locrian is one of the hardest modes to write in because of its flat fifth. Most music usually balances itself on a natural first and fifth (the first and fifth notes in the scale).\nThe flat fifth forced me to write in a chaotic style, but I quickly realized halfway in (through experimenting) that the song gave me a specific vibe that I decided to build on. That's why there's a such a stark change in tone in the middle of the song. This work really reminds me of the songs I made as a kid, and it makes me a little nostalgic.`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Evil Water`, {
                daw: `FL`, date: `8/17/2025`,
                shortDescription: `A song inspired by Deltarune's fourth chapter`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Finale`, {
                daw: `FL`, date: `8/25/2025`,
                shortDescription: `A song for Patrick's challenge`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`That Feeling`, {
                daw: `FL`, date: `9/24/2025`,
                shortDescription: `A song in an atrocious time signature`,
                longDescription: ``,
                //structure: [ [1, { bpm: 124, timeSignature: [10,6] }], ],
                structure: [ [1, { bpm: 93, timeSignature: [10,8] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),
    ]),

    // THE CHOWDER COLLECTION

    new Album(`The Chowder Collection`, `cover_TheChowderCollection`,
    [
        // Disc 1
        new Disc(`cover_TheChowderCollection`,
        [
            new Song(`Cringe-Bingers 2`, {
                daw: `FL`, date: `2/14/2025`,
                shortDescription: `May your sins haunt you...`,
                longDescription: `A long time ago in a land far away\nThere lived a little boy with blue eyes and marbles in his brain\nHis skin was bright, his hair was smooth, he had imagination\nNo one knew his fate had just begun\n[Music]\nDon't leave me out here, oh,\nNo no no\nFeel the clock run out of—\nThe boy made some friends called the Dogs, or something\nHe played their games and told them the things he loved, but it was nothin' to them\nCause they grew up with different obsessions\nThey pressured him to change his ways and become more like them.\n[Music]\nI'm dissociating\nNever ever changing!\nFleeting innocence\nWatch the clock run out of time\nThe boy kept attempting to find the perfect outlet for his inner struggles\nHis inner puzzles\nThat no one would seem to understand\nThat his friends were bad\nThat his best friend was the most manipulative friend he had\nHis hate grew, his lust grew, he just knew\nThe prophecy must've been true\nWhy does he have all the things I deserve, too?\nAm I the bad guy? Or is it you?\n[Music]\nEventually, the boy got the hang of his jealousy\nHe wrote a novel to encapsulate all of his memories\nHis friends weren't really evil, they just liked\nPlayin' around, it's natural, just get over it\nAnd at the end of the year his large friend group dressed up for the Freshman Formal\nThat's when someone approached him and told him something that would tear apart everything he knew about life`,
                structure: [
                    [1, { bpm: 125, timeSignature: [15,16] }],
                    [2, { timeSignature: [4,4] }],
                    [4, { timeSignature: [3,16] }],
                    [5, { bpm: 95, timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Prelude`, {
                daw: `FL`, date: `1/21/2025`,
                shortDescription: ``,
                longDescription: `I watched a video of someone playing chords in Desmos and I thought it was so beautiful that I wrote the prelude to sound like it.`,
                structure: [ [1, { bpm: 82, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`The Dogs Retake`, {
                daw: `FL`, date: `7/7/2024`,
                shortDescription: `A dark reimagining of "The Dogs" from the TDCC OST`,
                longDescription: ``,
                structure: [
                    [1,  { bpm: 80, timeSignature: [4,4], keySignature: 'E Major' }],
                    [9,  { bpm: 53 }],
                    [10, { bpm: 100 }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`The Destin Heist`, {
                daw: `FL`, date: `5/26/2024`,
                shortDescription: `Five friends find an alarming discovery when sneaking into their friend's house`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 60, timeSignature: [4,4] }],
                    [14, { timeSignature: [5,8] }],
                    [38, { timeSignature: [1,4] }],
                    [39, { bpm: 120, timeSignature: [6,4] }],
                    [40, { timeSignature: [7,4] }],
                    [42, { timeSignature: [5,4] }],
                    [44, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Long Overdue (The Slop)`, {
                daw: `FL`, date: `12/24/2023`,
                shortDescription: `The start of an introspective journey`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 130, timeSignature: [4,4] }],
                    [37, { timeSignature: [3,4]}],
                    [38, { timeSignature: [4,4]}],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`King Pat Rat`, {
                alternativeNames: [`Patrick's Theme`],
                daw: `FL`, date: `6/16/2024`,
                shortDescription: `A proper theme for an old friend`,
                longDescription: ``,
                structure: [ [1, { bpm: 108, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Gunky Funk (The Paste)`, {
                daw: `FL`, date: `12/27/2023`,
                shortDescription: `Hold onto your past, lest you let it slip away`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`BB BB BB`, {
                daw: `FL`, date: `9/2/2024`,
                shortDescription: `For the tenors`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 131, timeSignature: [2,4] }],
                    [2, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`OK (The Chicken Wrap)`, {
                daw: `FL`, date: `9/16/2024`,
                shortDescription: `This should be OK, right?`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 68, timeSignature: [4,4] }],
                    [7, {timeSignature: [5,4] }],
                    [8, { bpm: 130, timeSignature: [4,4] }],
                ],
                motifs: [],
            }),
            
            new Song(`Big Toe`, {
                daw: `FL`, date: `2/28/2025`,
                shortDescription: `Reaching the limit of humiliation`,
                longDescription: ``,
                structure: [[1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Smelting Germex (The Sludge)`, {
                daw: `FL`, date: `1/20/25`,
                shortDescription: `Won't you take a poor ginger's hand?`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`The Worm`, {
                daw: `FL`, date: `3/17/2024`,
                shortDescription: `A monstrous parasite overtakes Earth, using humanity as hosts, growing in size, and dominating civilization as we know it`,
                longDescription: ``,
                structure: [
                    [1, { bpm: 130, timeSignature: [4,4] }],
                    [41, { timeSignature: [11,8] }],
                    [45, { timeSignature: [1,4] }],
                    [46, { timeSignature: [11,8] }],
                    [53, { timeSignature: [12,8] }],
                    [54, { timeSignature: [2,4] }],
                    [55, { timeSignature: [4,4] }],
                    [71, { timeSignature: [6,4] }],
                    [72, { timeSignature: [4,4] }],
                    [95, { timeSignature: [9,8] }],
                    [96, { timeSignature: [4,4] }],
                    [104, { timeSignature: [11,8] }],
                    [108, { timeSignature: [1,4] }],
                    [109, { timeSignature: [11,8] }],
                    [116, { timeSignature: [12,8] }],
                    [117, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Halston (The Growth)`, {
                daw: `FL`, date: `8/7/2024`,
                shortDescription: `Finding answers in dubious places`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Interlude`, {
                daw: `FL`, date: `2/14/2025`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Within`, {
                daw: `FL`, date: `5/4/2024`,
                shortDescription: `In the belly of the beast`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Fragments`, {
                daw: `FL`, date: `7/25/2025`,
                shortDescription: `Who am I?`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Mistake`, {
                daw: `FL`, date: `10/13/2024`,
                shortDescription: `Forever changed, forever sinking, forever fearful`,
                longDescription: ``,
                structure: [ [1, { bpm: 125, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Comet`, {
                daw: `FL`, date: `12/8/2024`,
                shortDescription: `"Don't let the frustration consume you"`,
                longDescription: ``,
                structure: [ [1, { bpm: 96, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Rotten Broth`, {
                daw: `FL`, date: `11/3/2024`,
                shortDescription: `"That was bitty snarky and just overall rude but I'll try and take it like you didn't mean it that way"`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Amaranthine`, {
                daw: `FL`, date: `7/19/2025`,
                shortDescription: `Call of another's lust; answer of a thousand hatreds`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Proverbs 26 24-25`, {
                preferredName: `Proverbs 26:24-25`,
                daw: `FL+GB`, date: `6/24/2025`,
                shortDescription: `The Faker, The Manipulator, The Liar, The Allurer, The Parasite`,
                longDescription: `Proverbs is a summary of the entire album's storyline. It is broken into five parts, each a homage to a real life person and the wrongdoing they commit against myself or my friend group.`,
                structure: [ 
                    [1, { bpm: 120, timeSignature: [4,4] }],
                    [10, { bpm: 160 }],
                    [11, { timeSignature: [6,4] }],
                    [43, { timeSignature: [5,4] }],
                    [52, { timeSignature: [6,4] }],
                    [84, { timeSignature: [5,4] }],
                    [93, { timeSignature: [6,4] }],
                    [125, { timeSignature: [5,4] }],
                    [134, { timeSignature: [6,4] }],
                    [166, { timeSignature: [5,4] }],
                    [175, { timeSignature: [6,4] }],
                    [207, { timeSignature: [5,4] }],
                    [216, { timeSignature: [6,4] }],
                ],
                motifs: [
                    [19, 27, `VS Diaxr`],
                    [27, 35, `Worm Bass`],
                    [35, 43, `© Sonos Sculptura`],
                    [35, 43, `VS Diaxr`],
                    [43, 52, `Lust Descending`],
                    [60, 68, `Lust Saxophone`],
                    [67.5, 68, `David's Theme`],
                    [68, 70, `Worm Bass`],
                    [69, 70, `Denizen's Theme`],
                    [73, 74, `Denizen's Theme`],
                    [76, 84, `© Sonos Sculptura`],
                    [84, 93, `Lust Descending`],
                    [93, 101, `Lilly's Theme`],
                    [101, 109, `VS Diaxr`],
                    [109, 113, `© Revelations War Trumpet`], 
                    [117, 125, `© Sonos Sculptura`], 
                    [125, 134, `Lust Descending`],
                    [138, 142, `Plot Twisting`],
                    [142, 149.5, `Dark Love`],
                    [143.5, 144, `Denizen's Theme`],
                    [150, 157, `Love`],
                    [150, 158, `David's Theme`],
                    [158, 166, `© Sonos Sculptura`],
                    [158, 166, `© Binding of Isaac Theme`],
                    [163, 165, `Redhead`],
                    [167, 175, `Tanner Waltz`],
                    [177, 178, `VS Diaxr`],
                    [183, 191, `Redhead`],
                    [197, 198, `Denizen's Theme`],
                    [199, 208, `© Sonos Sculptura`],
                    [199, 208, `Worm Solo`],
                    [208, 216, `Lust Descending`],
                    [208, 216, `VS Diaxr Bridge`],
                ],
            }),
            
            new Song(`Postlude`, {
                daw: `FL`, date: `7/19/2025`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ 
                    [1, { bpm: 82, timeSignature: [5,4] }],
                    [3, { timeSignature: [4,4] }],
                    [34, { timeSignature: [5,16] }],
                    [35, { timeSignature: [4,4] }],
                ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`National Boyfriend Day`, {
                daw: `FL`, date: `10/3/2025`,
                shortDescription: `A song for a memorable moment`,
                longDescription: `...\nI only realized this later, but the melody kind of reflects the strings in "OK," which is a wonderful coincidence, considering these songs both describe the same thing but in different stages.`,
                structure: [
                    [1, { bpm: 62, timeSignature: [4,4] }],
                    [3, { timeSignature: [6,4] }],
                    [4, { timeSignature: [4,4] }],
                    [10, { timeSignature: [6,4] }],
                    [11, { timeSignature: [4,4] }],
                    [17, { timeSignature: [6,4] }],
                    [18, { timeSignature: [4,4] }],
                    [24, { timeSignature: [6,4] }],
                    [25, { timeSignature: [4,4] }],
                ],
                motifs: [
                    [1, 29, `National Boyfriend Day`],
                ],
                // NEEDS MOTIFS
            }),
            
            new Song(`Love`, {
                daw: `FL`, date: `10/20/25`,
                shortDescription: `...as they have I.`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),

        // Disc 2
        new Disc(`cover_TheChowderCollection_X`,
        [
            new Song(`Old Smelting Germex`, {
                daw: `FL`, date: `12/27/2023`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Run Away!`, {
                daw: `FL`, date: `6/20/2024`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Bruise`, {
                daw: `FL`, date: `3/22/2025`,
                shortDescription: ``,
                longDescription: `I made this song very rapidly and very late at night. I had just been messaged by Destin's girlfriend that he had been in a car accident. Even though she had told me he was okay, I wanted to write this song as fast as possible to capture the emotion from that initial moment of panic.`,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Nonchalant Redhead`, {
                daw: `FL`, date: `4/6/2025`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Emotional Dysregulation`, {
                daw: `FL`, date: `5/24/2025`,
                shortDescription: `Love`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Old Love`, {
                daw: `FL`, date: `1/20/2025`,
                shortDescription: ``,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),
    ]),

    new Album(`Singles`, null,
    [
        // Disc 1
        new Disc(null, [
            new Song(`Destin's 2023 Birthday Mixtape`, {
                cover: `cover_StuffNThings_2`,
                daw: `FL`, date: `8/7/2023`,
                shortDescription: `A year of recollection`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Destin's 2024 Birthday Mixtape`, {
                cover: `cover_StuffNThings_2`,
                daw: `FL`, date: `8/7/2024`,
                shortDescription: `A year of transformation`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Cosmo's 80s Adventure`, {
                cover: `cover_Cosmo`,
                daw: `FL`, date: `5/28/2023`,
                shortDescription: `Here he comes!`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),

            new Song(`Sunspots`, {
                cover: `cover_Sunspots`,
                daw: `FL`, date: `12/19/2025`,
                shortDescription: `There's something different about you`,
                longDescription: ``,
                structure: [ [1, { bpm: 100, timeSignature: [4,4] }], ],
                motifs: [
                    [19, 35, `Gamed and Bamed`],
                    [27, 35, `National Boyfriend Day`],
                    [43, 51, `Dogwater`],
                ],
            }),
            
            new Song(`Mechanical Paintbrush`, {
                cover: `cover_TSA_2024`,
                daw: `FL`, date: `5/22/2024`,
                shortDescription: `Our Music Production entry for the 2024 TSA Arkansas regionals`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
            
            new Song(`Amberwater Forge`, {
                cover: `cover_TSA_2025`,
                daw: `FL`, date: `2/20/2025`,
                shortDescription: `Our Music Production entry for the 2025 TSA Arkansas regionals`,
                longDescription: ``,
                structure: [ [1, { bpm: 0, timeSignature: [4,4] }], ],
                motifs: [ [0, 0, ``], ],
            }),
        ]),
    ]),
]