<template>
  <div class="flex flex-col h-full w-full gap-3 p-5">
    <div class="flex items-center justify-between gap-2 w-full p-2">
      <input type="text" placeholder="Enter search words" v-model="query"
        class="w-full p-3 border border-violet-400 rounded-lg shadow-md" />
      <button @click="search" :disabled="loading"
        class="flex items-center justify-center p-3 bg-violet-700 text-white border border-violet-400 rounded-lg shadow-md disabled:opacity-50">
        <loading-spinner v-if="loading"></loading-spinner>
        Search
      </button>
    </div>
    <div v-if="!loading && currentPageData" class="flex flex-col gap-3">
      <ul class="grid grid-cols-1 md:grid-cols-3 gap-5 p-3 bg-violet-500 border border-violet-900 rounded-lg shadow-md">
        <li v-for="(video, index) in currentPageData" :key="`video-${index}`">
          <a :href="video.contentUrl" target="_blank">
            <div class="bg-black relative pb-[50%] overflow-hidden h-0 rounded-md cursor-pointer outline-slate-300"
              :class="{
        'outline': playVideoIndex === index
      }" @touchstart="hiddenThumbIndex = undefined; playVideoIndex = index"
              @mouseover="hiddenThumbIndex = undefined; playVideoIndex = index"
              @mouseleave="playVideoIndex = undefined; hiddenThumbIndex = undefined;">
              <img v-show="hiddenThumbIndex !== index" :src="video.thumbnailUrl"
                class="absolute inset-0 w-full rounded-md" />
              <loading-spinner v-if="playVideoIndex === index && !hiddenThumbIndex"
                class="absolute inset-[50%]"></loading-spinner>
              <video v-if="playVideoIndex === index" :src="getVideoPreview(video.thumbnailUrl)"
                @loadeddata="hiddenThumbIndex = index" class="absolute inset-0 w-full rounded-md" autoplay loop muted
                playsinline>
              </video>
            </div>
          </a>
          <span class="text-sm text-white truncate w-full inline-block font-semibold">
            {{ video.name }}
          </span>
          <span class="text-sm text-white truncate w-full inline-block font-semibold">
            {{ video.duration.replace('PT00H', '').toLowerCase().split('m').join('m ') }}
          </span>
        </li>
      </ul>

    </div>
    <div v-else-if="loading"
      class="flex flex-col items-center justify-center h-full w-full gap-3 p-5 text-xl text-white">
      <loading-spinner v-if="loading"></loading-spinner>
    </div>
    <div v-else class="flex flex-col items-center justify-center h-full w-full gap-3 p-5 text-xl text-white">
      No Data...
    </div>
    <div v-if="links.length" class="flex items-center gap-2 overflow-x-auto w-full p-2">
      <button v-for="(link, index) in links" :key="`pagination-link-${index}`" :disabled="loading"
        class="w-full h-6  px-3 py-1 text-xs border border-white bg-violet-700 text-white disabled:opacity-50" :class="{
        'bg-violet-900': link === currentPage
      }" @click="loadPage(link)">{{ index }}</button>
    </div>
  </div>
</template>

<script setup>
import axios from 'axios';
import { ref } from 'vue';
import LoadingSpinner from './components/LoadingSpinner.vue';

const query = ref('');

const links = ref([]);
const currentPage = ref();
const currentPageData = ref();

const loading = ref(false);

const search = async () => {
  if (loading.value) {
    return;
  }

  if (!query.value) {
    alert('Please enter search words.');
    return;
  }

  loading.value = true;

  try {
    const response = (await axios.get('http://192.168.0.179:3000/search', {
      params: {
        query: query.value,
      }
    })).data;

    links.value = response?.links || [];
    currentPage.value = response?.link;
    currentPageData.value = response?.data;
  } catch (e) {
    if (e?.response?.status === 404) {
      alert('Not found');
      return;
    }

    alert(e?.response?.message || 'Something wrong.');
  } finally {
    loading.value = false;
  }
}

const loadPage = async (page) => {
  if (loading.value) {
    return;
  }

  loading.value = true;
  try {
    const response = (await axios.get('http://192.168.0.179:3000/load-page', {
      params: {
        page,
      }
    })).data;

    currentPage.value = page;
    currentPageData.value = response?.data;
  } catch (e) {
    if (e?.response?.status === 404) {
      alert('Not found');
      return;
    }

    alert(e?.response?.message || 'Something wrong.');
  } finally {
    loading.value = false;
  }
}

const hiddenThumbIndex = ref();
const playVideoIndex = ref();

const is_16_9 = (thumbLink) => (-1 !== thumbLink.indexOf("/thumbs169"));
const getVideoPreview = (thumbLink) => {
  return (thumbLink.substring(0, thumbLink.lastIndexOf("/")).replace(/\/thumbs(169)?(xnxx)?l*\//, "/videopreview/") + (is_16_9(thumbLink) ? "_169.mp4" : "_43.mp4")).replace(/(-[0-9]+)_([0-9]+)/, "_$2$1")
}

</script>
